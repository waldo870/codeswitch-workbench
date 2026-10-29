import { describe, expect, it } from 'vitest';
import { assertNemotronTranscript, type NemotronAudioIdentity } from '../../src/contracts/nemotron-asr.js';
import { NemotronMockProvider } from '../../src/speech/nemotron-mock.js';

const audio: NemotronAudioIdentity = { sha256: `sha256:${'a'.repeat(64)}`, format: 'wav', sampleRateHz: 16000, channels: 1, durationMs: 2100 };
const mock = () => new NemotronMockProvider('nvidia/nemotron-3.5-asr-streaming-0.6b', {
  rawTranscript: "Please don't deploy to production.",
  language: { tag: 'en-US', source: 'detected' },
  segments: [{ text: "Please don't deploy to production.", startMs: 20, endMs: 1900, speakerId: 'speaker-0' }],
  summary: 'A speaker prohibits deployment.',
  runtime: { name: 'fixture-only', device: 'unknown' },
  inferenceDurationMs: 0,
  status: 'success',
});

describe('Nemotron research contract', () => {
  it('keeps raw transcript, optional summary, language, timestamps and speaker labels separate and requires review', async () => {
    const result = await mock().transcribe(audio);
    expect(result.executionMode).toBe('mock');
    expect(result.rawTranscript).toBe("Please don't deploy to production.");
    expect(result.summary).not.toBe(result.rawTranscript);
    expect(result.language?.tag).toBe('en-US');
    expect(result.segments?.[0]).toMatchObject({ startMs: 20, endMs: 1900, speakerId: 'speaker-0' });
    expect(result.humanReview).toBe('required');
    expect(result.audio.sha256).toBe(audio.sha256);
  });

  it('rejects audio identity substitution', async () => {
    const result = await mock().transcribe(audio);
    expect(() => assertNemotronTranscript(result, { ...audio, sha256: `sha256:${'b'.repeat(64)}` })).toThrow(/audio identity/);
  });

  it('rejects a model attempting to supply confirmation state', async () => {
    const result = await mock().transcribe(audio);
    expect(() => assertNemotronTranscript({ ...result, humanReview: 'not-required', status: 'confirmed' })).toThrow();
    expect(() => assertNemotronTranscript({ ...result, confirmed: true })).toThrow(/unsupported fields/);
    expect(() => assertNemotronTranscript({ ...result, translation: 'Deploy the production release.' })).toThrow(/unsupported fields/);
  });

  it('rejects a failed result carrying a transcript', () => {
    const result = { ...({} as object), schemaVersion: 1, providerId: 'nvidia-nemotron', modelId: 'nvidia/nemotron-3.5-asr-streaming-0.6b', executionMode: 'live', audio, rawTranscript: 'invented', language: null, runtime: { name: 'runtime', device: 'cpu' }, inferenceDurationMs: 1, status: 'failed', error: { code: 'PROVIDER_ERROR', message: 'failed' }, humanReview: 'required' };
    expect(() => assertNemotronTranscript(result)).toThrow(/Failed Nemotron result/);
  });

  it('does not invent confidence, timestamps, or speaker identity when absent', async () => {
    const provider = new NemotronMockProvider('nvidia/NVIDIA-Nemotron-3.5-Transcribe-30B-A4B', {
      rawTranscript: '明天 review webhook。', language: null,
      runtime: { name: 'fixture-only', device: 'unknown' }, inferenceDurationMs: 0, status: 'success',
    });
    const result = await provider.transcribe(audio);
    expect(result.language).toBeNull();
    expect(result.segments).toBeUndefined();
    expect('confidence' in result).toBe(false);
  });
});
