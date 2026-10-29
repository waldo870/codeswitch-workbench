import type { NemotronAsrProvider, NemotronAudioIdentity, NemotronModelId, NemotronTranscriptResult } from '../contracts/nemotron-asr.js';
import { assertNemotronTranscript, NEMOTRON_PROVIDER_ID } from '../contracts/nemotron-asr.js';

/** Deterministic fixture adapter. It performs no ASR and never reports live mode. */
export class NemotronMockProvider implements NemotronAsrProvider {
  readonly providerId = NEMOTRON_PROVIDER_ID;
  readonly executionMode = 'mock' as const;

  constructor(readonly modelId: NemotronModelId, private readonly fixture: Omit<NemotronTranscriptResult, 'schemaVersion' | 'providerId' | 'modelId' | 'executionMode' | 'audio' | 'humanReview'>) {}

  async transcribe(audio: NemotronAudioIdentity, signal?: AbortSignal): Promise<NemotronTranscriptResult> {
    if (signal?.aborted) throw new Error('Mock transcription cancelled.');
    const result: NemotronTranscriptResult = {
      schemaVersion: 1,
      providerId: this.providerId,
      modelId: this.modelId,
      executionMode: 'mock',
      audio: { ...audio },
      ...this.fixture,
      humanReview: 'required',
    };
    assertNemotronTranscript(result, audio);
    return result;
  }
}
