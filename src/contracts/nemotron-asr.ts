/**
 * Research-only boundary for future Nemotron speech providers.
 * This contract does not implement or imply a live NVIDIA runtime.
 */
export const NEMOTRON_PROVIDER_ID = 'nvidia-nemotron' as const;
export const NEMOTRON_MODEL_IDS = [
  'nvidia/NVIDIA-Nemotron-3.5-Transcribe-30B-A4B',
  'nvidia/nemotron-3.5-asr-streaming-0.6b',
] as const;

export type NemotronModelId = typeof NEMOTRON_MODEL_IDS[number];
export type NemotronExecutionMode = 'mock' | 'live';

export interface NemotronAudioIdentity {
  sha256: `sha256:${string}`;
  format: 'wav' | 'flac' | 'mp3' | 'ogg';
  sampleRateHz: number;
  channels: number;
  durationMs: number;
}

export interface NemotronTranscriptSegment {
  text: string;
  /** Optional model-provided time; never synthesized by the adapter. */
  startMs?: number;
  endMs?: number;
  /** Opaque diarization label, not a verified human identity. */
  speakerId?: string;
  language?: string;
}

export interface NemotronTranscriptResult {
  schemaVersion: 1;
  providerId: typeof NEMOTRON_PROVIDER_ID;
  modelId: NemotronModelId;
  executionMode: NemotronExecutionMode;
  audio: NemotronAudioIdentity;
  /** Immutable provider transcript, kept separate from summaries/translations. */
  rawTranscript: string;
  language: { tag: string; source: 'detected' | 'requested' } | null;
  segments?: NemotronTranscriptSegment[];
  /** Optional descriptive output; it must never replace rawTranscript. */
  summary?: string;
  runtime: { name: string; version?: string; device: 'cpu' | 'gpu' | 'unknown' };
  inferenceDurationMs: number;
  status: 'success' | 'failed';
  error?: { code: 'UNAVAILABLE' | 'TIMEOUT' | 'MALFORMED_RESPONSE' | 'PROVIDER_ERROR'; message: string };
  humanReview: 'required';
}

export interface NemotronAsrProvider {
  readonly providerId: typeof NEMOTRON_PROVIDER_ID;
  readonly modelId: NemotronModelId;
  readonly executionMode: NemotronExecutionMode;
  transcribe(audio: NemotronAudioIdentity, signal?: AbortSignal): Promise<NemotronTranscriptResult>;
}

const shaPattern = /^sha256:[0-9a-f]{64}$/;
const safeLabel = (value: unknown, max: number) => typeof value === 'string' && value.length > 0 && value.length <= max;
const onlyKeys = (value: object, keys: string[]) => Object.keys(value).every(key => keys.includes(key));

/** Strict boundary validation. It intentionally does not infer transcript semantics. */
export function assertNemotronTranscript(value: unknown, expectedAudio?: NemotronAudioIdentity): asserts value is NemotronTranscriptResult {
  if (!value || typeof value !== 'object') throw new Error('Nemotron result must be an object.');
  const result = value as NemotronTranscriptResult;
  const audio = result.audio;
  if (!onlyKeys(result, ['schemaVersion', 'providerId', 'modelId', 'executionMode', 'audio', 'rawTranscript', 'language', 'segments', 'summary', 'runtime', 'inferenceDurationMs', 'status', 'error', 'humanReview'])) throw new Error('Nemotron result contains unsupported fields.');
  if (result.schemaVersion !== 1 || result.providerId !== NEMOTRON_PROVIDER_ID || !NEMOTRON_MODEL_IDS.includes(result.modelId) || !['mock', 'live'].includes(result.executionMode)) throw new Error('Nemotron provider provenance is invalid.');
  if (!audio || !onlyKeys(audio, ['sha256', 'format', 'sampleRateHz', 'channels', 'durationMs'])) throw new Error('Nemotron audio identity has unsupported fields.');
  if (!audio || !shaPattern.test(audio.sha256) || !['wav', 'flac', 'mp3', 'ogg'].includes(audio.format) || !Number.isInteger(audio.sampleRateHz) || audio.sampleRateHz <= 0 || !Number.isInteger(audio.channels) || audio.channels < 1 || !Number.isFinite(audio.durationMs) || audio.durationMs <= 0) throw new Error('Nemotron audio identity is invalid.');
  if (expectedAudio && (audio.sha256 !== expectedAudio.sha256 || audio.format !== expectedAudio.format || audio.sampleRateHz !== expectedAudio.sampleRateHz || audio.channels !== expectedAudio.channels || audio.durationMs !== expectedAudio.durationMs)) throw new Error('Nemotron result does not match the supplied audio identity.');
  if (!['success', 'failed'].includes(result.status) || result.humanReview !== 'required' || !result.runtime || !onlyKeys(result.runtime, ['name', 'version', 'device']) || !safeLabel(result.runtime.name, 100) || (result.runtime.version !== undefined && !safeLabel(result.runtime.version, 100)) || !['cpu', 'gpu', 'unknown'].includes(result.runtime.device) || !Number.isFinite(result.inferenceDurationMs) || result.inferenceDurationMs < 0) throw new Error('Nemotron result status or runtime metadata is invalid.');
  if (result.language !== null && (!result.language || !onlyKeys(result.language, ['tag', 'source']) || !safeLabel(result.language.tag, 50) || !['detected', 'requested'].includes(result.language.source))) throw new Error('Nemotron language metadata is invalid.');
  if (result.status === 'success' && (!safeLabel(result.rawTranscript, 10000) || result.error !== undefined)) throw new Error('Successful Nemotron result must contain only a raw transcript.');
  if (result.status === 'failed' && (result.rawTranscript !== '' || !result.error || !onlyKeys(result.error, ['code', 'message']) || !['UNAVAILABLE', 'TIMEOUT', 'MALFORMED_RESPONSE', 'PROVIDER_ERROR'].includes(result.error.code) || !safeLabel(result.error.message, 500))) throw new Error('Failed Nemotron result is malformed.');
  if (result.summary !== undefined && (typeof result.summary !== 'string' || result.summary.length > 5000)) throw new Error('Nemotron summary is invalid.');
  if (result.segments !== undefined && (!Array.isArray(result.segments) || result.segments.length > 10000 || result.segments.some(segment => !segment || !onlyKeys(segment, ['text', 'startMs', 'endMs', 'speakerId', 'language']) || typeof segment.text !== 'string' || segment.text.length > 2000 || segment.startMs !== undefined && (!Number.isFinite(segment.startMs) || segment.startMs < 0) || segment.endMs !== undefined && (!Number.isFinite(segment.endMs) || segment.endMs < 0) || segment.startMs !== undefined && segment.endMs !== undefined && segment.endMs < segment.startMs || segment.speakerId !== undefined && (typeof segment.speakerId !== 'string' || segment.speakerId.length > 100) || segment.language !== undefined && (typeof segment.language !== 'string' || segment.language.length > 50)))) throw new Error('Nemotron segment metadata is invalid.');
}
