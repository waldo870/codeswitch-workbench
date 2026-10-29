import type { DualAsrProviderId, DualAsrUpdate, StreamingAsrProvider } from '../contracts/dual-edge-asr.js';
import type { NemotronAudioIdentity } from '../contracts/nemotron-asr.js';

/** Explicitly synthetic stream fixture; it never invokes either ASR runtime. */
export class MockStreamingAsrProvider implements StreamingAsrProvider {
  readonly executionMode = 'mock' as const;

  constructor(readonly providerId: DualAsrProviderId, readonly modelId: string, private readonly updates: Omit<DualAsrUpdate, 'providerId' | 'modelId' | 'executionMode' | 'audioSha256'>[]) {}

  async *stream(audio: NemotronAudioIdentity, signal?: AbortSignal): AsyncIterable<DualAsrUpdate> {
    for (const item of this.updates) {
      if (signal?.aborted) throw new Error('Mock ASR stream cancelled.');
      await Promise.resolve();
      yield { ...item, providerId: this.providerId, modelId: this.modelId, executionMode: 'mock', audioSha256: audio.sha256 };
    }
  }
}
