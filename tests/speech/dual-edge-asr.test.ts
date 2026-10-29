import { describe, expect, it } from 'vitest';
import { acceptDualAsrUpdate, canAnalyzeDualAsrReview, createDualAsrReview, reviewDualAsrTranscript, type DualAsrUpdate } from '../../src/contracts/dual-edge-asr.js';
import { MockStreamingAsrProvider } from '../../src/speech/dual-asr-mock.js';

const sha = `sha256:${'c'.repeat(64)}` as const;
const audio = { sha256: sha, format: 'wav' as const, sampleRateHz: 16000, channels: 1, durationMs: 2400 };
const update = (providerId: DualAsrUpdate['providerId'], modelId: string, sequence: number, stage: DualAsrUpdate['stage'], transcript: string, extra: Partial<DualAsrUpdate> = {}): DualAsrUpdate => ({
  providerId, modelId, executionMode: 'mock', audioSha256: sha, sequence, stage, transcript, language: { tag: 'en-US', source: 'detected' }, runtime: { name: 'fixture-only', device: 'unknown' }, emittedAtMs: sequence, ...extra,
});

describe('dual edge ASR research contract', () => {
  it('supports three explicit provider modes and keeps partials ineligible for analysis', () => {
    for (const mode of ['hailo_only', 'nemotron_only', 'dual_review'] as const) expect(createDualAsrReview(mode, sha).mode).toBe(mode);
    let state = acceptDualAsrUpdate(createDualAsrReview('nemotron_only', sha), update('nvidia-nemotron', 'nvidia/nemotron-3.5-asr-streaming-0.6b', 0, 'partial', 'Partial transcript'));
    expect(state.reviewStatus).toBe('awaiting_final');
    expect(canAnalyzeDualAsrReview(state)).toBe(false);
    state = acceptDualAsrUpdate(state, update('nvidia-nemotron', 'nvidia/nemotron-3.5-asr-streaming-0.6b', 1, 'final', 'Final transcript'));
    expect(state.status).toBe('completed');
    expect(state.reviewStatus).toBe('review_required');
    expect(canAnalyzeDualAsrReview(state)).toBe(false);
  });

  it('retains both raw finals and marks negation, number, deadline and prerequisite differences for review', () => {
    let state = createDualAsrReview('dual_review', sha);
    state = acceptDualAsrUpdate(state, update('hailo-10h', 'whisper-base', 0, 'final', "Don't deploy 2 servers tomorrow before review."));
    state = acceptDualAsrUpdate(state, update('nvidia-nemotron', 'nvidia/nemotron-3.5-asr-streaming-0.6b', 0, 'final', 'Deploy 3 servers today after review.'));
    expect(state.status).toBe('completed');
    expect(state.providers['hailo-10h']?.final?.transcript).toContain("Don't");
    expect(state.providers['nvidia-nemotron']?.final?.transcript).toContain('Deploy');
    expect(state.disagreements.map(item => item.category)).toEqual(['negation', 'number', 'deadline', 'prerequisite']);
    expect(state.reviewStatus).toBe('review_required');
    expect(canAnalyzeDualAsrReview(state)).toBe(false);
  });

  it('requires explicit human review and never inherits a confirmed state from a provider', () => {
    let state = createDualAsrReview('dual_review', sha);
    state = acceptDualAsrUpdate(state, update('hailo-10h', 'whisper-base', 0, 'final', 'Keep draft only.'));
    state = acceptDualAsrUpdate(state, update('nvidia-nemotron', 'nvidia/nemotron-3.5-asr-streaming-0.6b', 0, 'final', 'Keep draft only.'));
    expect(() => reviewDualAsrTranscript(state, 'hailo-10h')).not.toThrow();
    state = reviewDualAsrTranscript(state, 'nvidia-nemotron');
    expect(state.reviewedTranscript).toBe('Keep draft only.');
    expect(state.reviewedFrom).toBe('nvidia-nemotron');
    expect(canAnalyzeDualAsrReview(state)).toBe(true);
  });

  it('rejects wrong audio provenance, wrong mode provider, duplicate final, and non-monotonic sequence', () => {
    const base = createDualAsrReview('hailo_only', sha);
    expect(() => acceptDualAsrUpdate(base, { ...update('hailo-10h', 'whisper-base', 0, 'partial', 'x'), audioSha256: `sha256:${'d'.repeat(64)}` })).toThrow(/provenance/);
    expect(() => acceptDualAsrUpdate(base, update('nvidia-nemotron', 'model', 0, 'partial', 'x'))).toThrow(/provenance/);
    let state = acceptDualAsrUpdate(base, update('hailo-10h', 'whisper-base', 2, 'partial', 'p'));
    expect(() => acceptDualAsrUpdate(state, update('hailo-10h', 'whisper-base', 1, 'partial', 'older'))).toThrow(/sequence/);
    state = acceptDualAsrUpdate(state, update('hailo-10h', 'whisper-base', 3, 'final', 'done'));
    expect(() => acceptDualAsrUpdate(state, update('hailo-10h', 'whisper-base', 4, 'final', 'second'))).toThrow(/no longer collecting/);
  });

  it('represents timeout and cancellation as provider errors rather than transcripts', () => {
    let state = acceptDualAsrUpdate(createDualAsrReview('nemotron_only', sha), update('nvidia-nemotron', 'model', 0, 'error', '', { error: { code: 'TIMEOUT', message: 'Timed out.' } }));
    expect(state.status).toBe('failed');
    expect(canAnalyzeDualAsrReview(state)).toBe(false);
    state = acceptDualAsrUpdate(createDualAsrReview('hailo_only', sha), update('hailo-10h', 'whisper-tiny', 0, 'error', '', { error: { code: 'CANCELLED', message: 'Cancelled.' } }));
    expect(state.status).toBe('cancelled');
  });

  it('mock stream identifies itself as mock and can be cancelled', async () => {
    const mock = new MockStreamingAsrProvider('hailo-10h', 'whisper-base', [
      { sequence: 0, stage: 'partial', transcript: 'partial', language: null, runtime: { name: 'fixture-only', device: 'unknown' }, emittedAtMs: 0 },
      { sequence: 1, stage: 'final', transcript: 'final', language: null, runtime: { name: 'fixture-only', device: 'unknown' }, emittedAtMs: 1 },
    ]);
    const controller = new AbortController();
    const it = mock.stream(audio, controller.signal)[Symbol.asyncIterator]();
    expect((await it.next()).value).toMatchObject({ executionMode: 'mock', stage: 'partial', audioSha256: sha });
    controller.abort();
    await expect(it.next()).rejects.toThrow(/cancelled/);
  });
});
