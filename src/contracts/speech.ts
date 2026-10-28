export interface AudioSource { id: string; name: string; bytes: number; duration: number; format: 'wav'; sampleRate: 16000; channels: 1; bitsPerSample: 16 }
export type SpeechErrorCode = 'UNAVAILABLE' | 'TIMEOUT' | 'CANCELLED' | 'FORMAT' | 'CORRUPTED_AUDIO' | 'TOO_LARGE' | 'TOO_LONG' | 'EMPTY_TRANSCRIPT' | 'MALFORMED_RESPONSE' | 'MISSING_MODEL' | 'PROVIDER_ERROR';
export interface SpeechResult { sourceAudioId: string; transcript: string; language: string | null; modelId: string; provider: string; duration: number; inferenceDuration: number; confidence?: number; status: 'success' | 'failed' | 'cancelled'; errors: { code: SpeechErrorCode; message: string }[] }
export interface SpeechSession { schemaVersion: 1; source: AudioSource; recognition: SpeechResult; transcript: string; edits: { before: string; after: string }[]; revision: number; confirmedRevision: number | null }
export interface SpeechProvenance { session: SpeechSession; origin: 'raw-asr' | 'corrected-transcript' }
export interface SpeechRecognizer { transcribe(bytes: Uint8Array, source: AudioSource, signal?: AbortSignal): Promise<SpeechResult> }
