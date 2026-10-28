import type { AudioFormatMetadata, SpeechErrorCode } from './speech.js';

export const HAILO_WORKER_PROTOCOL = 'codeswitch.hailo-asr.v1' as const;
export const HAILO_WORKER_MAX_AUDIO_BYTES = 4_000_000;
export const HAILO_WORKER_MAX_REQUEST_BYTES = 5_500_000;
export const HAILO_WORKER_MAX_RESPONSE_BYTES = 64_000;
export const HAILO_WORKER_TIMEOUT_MS = 30_000;
export type HailoWhisperVariant = 'whisper-base' | 'whisper-tiny';

export interface HailoHealthRequest {
  protocol: typeof HAILO_WORKER_PROTOCOL;
  requestId: string;
  operation: 'health';
}
export interface HailoTranscribeRequest {
  protocol: typeof HAILO_WORKER_PROTOCOL;
  requestId: string;
  operation: 'transcribe';
  providerId: 'hailo-10h';
  modelId: HailoWhisperVariant;
  sourceAudioId: string;
  audioFormat: AudioFormatMetadata;
  audioBase64: string;
}
export type HailoWorkerRequest = HailoHealthRequest | HailoTranscribeRequest;

export interface HailoHealthResponse {
  protocol: typeof HAILO_WORKER_PROTOCOL;
  requestId: string;
  operation: 'health';
  status: 'ready' | 'mock-only' | 'hardware-unavailable';
  providerId: 'hailo-10h';
  deviceDetected: boolean;
  runtimeVersion?: string;
  architecture?: string;
  errorCode?: 'HARDWARE_UNAVAILABLE' | 'WORKER_ERROR';
}
export interface HailoTranscribeResponse {
  protocol: typeof HAILO_WORKER_PROTOCOL;
  requestId: string;
  operation: 'transcribe';
  status: 'success' | 'error';
  executionMode: 'live' | 'mock';
  providerId: 'hailo-10h';
  modelId: HailoWhisperVariant;
  sourceAudioId: string;
  audioSha256: string;
  transcript?: string;
  language?: string | null;
  inferenceDurationMs?: number;
  errorCode?: SpeechErrorCode;
}
