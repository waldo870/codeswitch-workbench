import type { AudioSource, SpeechProvider, SpeechResult, SpeechSession } from '../contracts/speech.js';
import { assertSpeechResult, newSpeech } from './session.js';

/** Small provider registry shared by Node integrations; browser code receives only the selected same-origin bridge. */
export class SpeechProviderRegistry {
  private readonly providers = new Map<string, SpeechProvider>();

  register(provider: SpeechProvider): void {
    if (!provider.providerId || !provider.modelId || this.providers.has(provider.providerId)) {
      throw new Error('ASR provider ID must be unique and model metadata must be present.');
    }
    this.providers.set(provider.providerId, provider);
  }

  get(providerId: string): SpeechProvider {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Unknown ASR provider: ${providerId}`);
    return provider;
  }

  list(): { providerId: string; modelId: string; executionMode: 'live' | 'mock' }[] {
    return [...this.providers.values()].map(({ providerId, modelId, executionMode }) => ({ providerId, modelId, executionMode }));
  }

  async transcribe(providerId: string, bytes: Uint8Array, source: AudioSource, signal?: AbortSignal): Promise<SpeechResult> {
    const provider = this.get(providerId);
    const result = await provider.transcribe(bytes, source, signal);
    assertSpeechResult(result, source.id, source.duration);
    if (!result.audioFormat || !result.runtime || result.provider !== provider.providerId || result.modelId !== provider.modelId || result.runtime.mode !== provider.executionMode) {
      throw new Error('ASR result does not match the selected provider metadata.');
    }
    return result;
  }

  /** A fresh provider run always creates a new unconfirmed session; it cannot inherit edits or confirmation. */
  async startSession(providerId: string, bytes: Uint8Array, source: AudioSource, signal?: AbortSignal): Promise<SpeechSession> {
    const result = await this.transcribe(providerId, bytes, source, signal);
    if (result.status !== 'success') throw new Error(result.errors[0]?.message ?? 'ASR provider failed.');
    return newSpeech(source, result);
  }
}
