import { randomUUID } from 'node:crypto';
import type { AudioFormatMetadata, AudioSource, SpeechProvider, SpeechProviderResult, SpeechResult, SpeechRuntimeMetadata } from '../contracts/speech.js';
import type { HailoHealthRequest, HailoHealthResponse, HailoTranscribeRequest, HailoTranscribeResponse, HailoWhisperVariant, HailoWorkerRequest } from '../contracts/hailo-worker.js';
import { HAILO_WORKER_PROTOCOL, HAILO_WORKER_MAX_AUDIO_BYTES } from '../contracts/hailo-worker.js';
import { identifyAudio, SpeechError } from './audio.js';

export interface HailoWorkerClient {
  readonly executionMode: 'live' | 'mock';
  health(request: HailoHealthRequest, signal?: AbortSignal): Promise<unknown>;
  transcribe(request: HailoTranscribeRequest, signal?: AbortSignal): Promise<unknown>;
}

const audioFormat: AudioFormatMetadata = { container: 'wav', encoding: 'pcm_s16le', sampleRateHz: 16000, channels: 1, bitsPerSample: 16 };
const exactKeys = (value: object, keys: string[]) => Object.keys(value).every(key => keys.includes(key));
function validHealth(value: unknown, id: string): value is HailoHealthResponse {
  if (!value || typeof value !== 'object') return false;
  const r = value as HailoHealthResponse;
  return r.protocol === HAILO_WORKER_PROTOCOL && r.requestId === id && r.operation === 'health' && r.providerId === 'hailo-10h' && ['ready', 'mock-only', 'hardware-unavailable'].includes(r.status) && typeof r.deviceDetected === 'boolean' && (r.status==='ready')===r.deviceDetected && (r.status!=='mock-only'||!r.deviceDetected) && (r.runtimeVersion===undefined||typeof r.runtimeVersion==='string'&&r.runtimeVersion.length<=100) && (r.architecture===undefined||typeof r.architecture==='string'&&r.architecture.length<=100) && exactKeys(r, ['protocol','requestId','operation','status','providerId','deviceDetected','runtimeVersion','architecture','errorCode']);
}
function validTranscription(value: unknown, request: HailoTranscribeRequest): value is HailoTranscribeResponse {
  if (!value || typeof value !== 'object') return false;
  const r = value as HailoTranscribeResponse;
  return r.protocol === HAILO_WORKER_PROTOCOL && r.requestId === request.requestId && r.operation === 'transcribe' && ['success','error'].includes(r.status) && ['live','mock'].includes(r.executionMode) && r.providerId === request.providerId && r.modelId === request.modelId && r.sourceAudioId === request.sourceAudioId && typeof r.audioSha256 === 'string' && exactKeys(r, ['protocol','requestId','operation','status','executionMode','providerId','modelId','sourceAudioId','audioSha256','transcript','language','inferenceDurationMs','errorCode']) && (r.status === 'error' || typeof r.transcript === 'string' && r.transcript.length <= 10_000 && (r.language === undefined || r.language === null || typeof r.language === 'string' && r.language.length <= 50) && typeof r.inferenceDurationMs === 'number' && Number.isFinite(r.inferenceDurationMs) && r.inferenceDurationMs >= 0);
}

export class HailoSpeechRecognizer implements SpeechProvider {
  readonly providerId = 'hailo-10h';
  readonly modelId: HailoWhisperVariant;
  constructor(private readonly worker: HailoWorkerClient, variant: 'base' | 'tiny' = 'base') {
    this.modelId = `whisper-${variant}`;
  }
  get executionMode() { return this.worker.executionMode; }

  private runtime(health?: HailoHealthResponse): SpeechRuntimeMetadata {
    return { mode: this.worker.executionMode, runtime: 'hailo-worker-v1', device: health?.deviceDetected ? 'hailo' : 'unknown', ...(health?.runtimeVersion ? { version: health.runtimeVersion } : {}), ...(health?.architecture ? { architecture: health.architecture } : {}) };
  }

  async transcribe(bytes: Uint8Array, source: AudioSource, signal?: AbortSignal): Promise<SpeechProviderResult> {
    const started = performance.now();
    const base = { sourceAudioId: source.id, language: null, modelId: this.modelId, provider: this.providerId, duration: source.duration, audioFormat, runtime: this.runtime() };
    const failed = (code: SpeechResult['errors'][number]['code'], message: string, runtime = base.runtime): SpeechProviderResult => ({ ...base, runtime, transcript: '', inferenceDuration: performance.now() - started, status: code === 'CANCELLED' ? 'cancelled' : 'failed', errors: [{ code, message }] });
    try {
      if (bytes.byteLength > HAILO_WORKER_MAX_AUDIO_BYTES) return failed('TOO_LARGE', 'Audio exceeds 4 MB.');
      const verified = await identifyAudio(bytes, source.name);
      if (verified.id !== source.id || verified.duration !== source.duration || verified.format !== source.format || verified.sampleRate !== source.sampleRate || verified.channels !== source.channels || verified.bitsPerSample !== source.bitsPerSample) return failed('CORRUPTED_AUDIO', 'Audio identity or format changed.');
      if (signal?.aborted) return failed('CANCELLED', 'Transcription cancelled.');
      const healthRequest: HailoHealthRequest = { protocol: HAILO_WORKER_PROTOCOL, requestId: randomUUID(), operation: 'health' };
      const rawHealth = await this.worker.health(healthRequest, signal);
      if (!validHealth(rawHealth, healthRequest.requestId)) return failed('WORKER_PROTOCOL', 'Hailo worker health response was invalid.');
      const runtime = this.runtime(rawHealth);
      if (rawHealth.status === 'hardware-unavailable' || !rawHealth.deviceDetected && rawHealth.status !== 'mock-only') return failed('HARDWARE_UNAVAILABLE', 'Hailo hardware is unavailable.', runtime);
      if (rawHealth.status === 'mock-only' && this.worker.executionMode !== 'mock') return failed('HARDWARE_UNAVAILABLE', 'Mock worker cannot satisfy a live Hailo request.', runtime);
      const request: HailoTranscribeRequest = { protocol: HAILO_WORKER_PROTOCOL, requestId: randomUUID(), operation: 'transcribe', providerId: this.providerId, modelId: this.modelId, sourceAudioId: source.id, audioFormat, audioBase64: Buffer.from(bytes).toString('base64') };
      const response = await this.worker.transcribe(request, signal);
      if (!validTranscription(response, request) || response.executionMode !== this.worker.executionMode) return failed('WORKER_PROTOCOL', 'Hailo worker transcription response was invalid or execution mode mismatched.', runtime);
      if (response.audioSha256 !== source.id.slice('sha256:'.length)) return failed('CORRUPTED_AUDIO', 'Hailo worker audio digest did not match the source.', runtime);
      if (response.status === 'error') return failed(response.errorCode === 'HARDWARE_UNAVAILABLE' ? 'HARDWARE_UNAVAILABLE' : 'WORKER_ERROR', 'Hailo worker could not transcribe this audio.', runtime);
      if (typeof response.transcript !== 'string' || !response.transcript.trim()) return failed('EMPTY_TRANSCRIPT', 'Hailo worker returned an empty transcript.', runtime);
      return { ...base, runtime, transcript: response.transcript, language: response.language ?? null, inferenceDuration: response.inferenceDurationMs!, status: 'success', errors: [] };
    } catch (error) {
      const code = error instanceof SpeechError ? error.code : signal?.aborted ? 'CANCELLED' : 'WORKER_ERROR';
      return failed(code, error instanceof SpeechError ? error.message : 'Hailo worker request failed.');
    }
  }
}

export class UnavailableHailoWorkerClient implements HailoWorkerClient {
  readonly executionMode = 'live' as const;
  async health(request: HailoHealthRequest): Promise<HailoHealthResponse> { return { protocol: HAILO_WORKER_PROTOCOL, requestId: request.requestId, operation: 'health', status: 'hardware-unavailable', providerId: 'hailo-10h', deviceDetected: false, errorCode: 'HARDWARE_UNAVAILABLE' }; }
  async transcribe(): Promise<never> { throw new SpeechError('HARDWARE_UNAVAILABLE', 'No Hailo hardware worker is configured.'); }
}

/** Explicit test-only worker. Never used by the browser bridge or selected as a live provider. */
export class MockHailoWorkerClient implements HailoWorkerClient {
  readonly executionMode = 'mock' as const;
  async health(request: HailoHealthRequest, signal?: AbortSignal): Promise<HailoHealthResponse> {
    if (signal?.aborted) throw new SpeechError('CANCELLED', 'Transcription cancelled.');
    return { protocol: HAILO_WORKER_PROTOCOL, requestId: request.requestId, operation: 'health', status: 'mock-only', providerId: 'hailo-10h', deviceDetected: false };
  }
  async transcribe(request: HailoTranscribeRequest, signal?: AbortSignal): Promise<HailoTranscribeResponse> {
    if (signal?.aborted) throw new SpeechError('CANCELLED', 'Transcription cancelled.');
    const digest = await import('node:crypto').then(({ createHash }) => createHash('sha256').update(Buffer.from(request.audioBase64, 'base64')).digest('hex'));
    return { protocol: HAILO_WORKER_PROTOCOL, requestId: request.requestId, operation: 'transcribe', status: 'success', executionMode: 'mock', providerId: request.providerId, modelId: request.modelId, sourceAudioId: request.sourceAudioId, audioSha256: digest, transcript: 'MOCK ONLY — no Hailo inference was performed.', language: null, inferenceDurationMs: 0 };
  }
}
