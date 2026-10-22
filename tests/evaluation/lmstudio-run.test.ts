import { expect, it, vi } from 'vitest';
import { evaluateLMStudio, runSmoke, SMOKE_IDS, selectLMStudioModel } from '../../src/evaluation/lmstudio-run.js';
import type { RunReport } from '../../src/evaluation/report.js';
import type { ExtractionResult } from '../../src/llm/types.js';
const absent = { status: 'NOT_RUN' as const, version: null, models: [], reason: 'unit-test service absence' };
it('records unavailable live stages with null B/C scores and real A baseline', async () => {
  let report: RunReport | undefined; const provider = vi.fn();
  expect(await evaluateLMStudio(['--probe-only'], { probe: async () => absent, provider, save: r => { report = r; } })).toBe(2);
  expect(provider).not.toHaveBeenCalled(); expect(report!.methods[0]!.cases).toHaveLength(60);
  expect(report!.methods.slice(1).every(m => m.status === 'NOT_RUN' && m.summary === null && m.cases.length === 0)).toBe(true);
  expect(report!.stages).toMatchObject({ smoke: 'NOT_RUN', fullLiveBenchmark: 'NOT_RUN' });
});
it('requires explicit selection with multiple IDs and refuses nonexistent IDs', () => {
  const probe = { ...absent, status: 'AVAILABLE' as const, models: [{ id: 'model-a', digest: null, details: {} }, { id: 'model-b', digest: null, details: {} }] };
  expect(selectLMStudioModel(probe)).toBeNull(); expect(selectLMStudioModel(probe, 'model-b')).toBe('model-b'); expect(() => selectLMStudioModel(probe, 'missing')).toThrow();
});
it('frozen smoke uses eight source strings without gold labels, preserving interceptions', async () => {
  const extract = vi.fn(async (input: string): Promise<ExtractionResult> => ({ sourceInput: input, identity: { provider: 'mock-test', model: 'not-live', digest: null, providerVersion: null }, rawText: 'mock only', durationMs: 0, rawValidation: 'valid', error: null, proposal: { cards: [], constraints: [], unresolved: [{ evidence: input, reason: 'mock refusal' }] } }));
  const smoke = await runSmoke({ extract }); expect(smoke.status).toBe('PASS'); expect(smoke.ids).toEqual([...SMOKE_IDS]); expect(extract).toHaveBeenCalledTimes(8); expect(extract.mock.calls.every(c => c.length === 1 && typeof c[0] === 'string')).toBe(true);
  expect(smoke.verified.some(c => c.verification.errors.some(e => e.startsWith('omitted_constraint')))).toBe(true);
});
it('failed smoke prevents all full benchmark calls and retains NOT_RUN full scores', async () => {
  const extract = vi.fn(async (sourceInput: string): Promise<ExtractionResult> => ({ sourceInput, identity: { provider: 'mock-test', model: 'not-live', digest: null, providerVersion: null }, durationMs: 0, rawText: null, proposal: null, rawValidation: 'invalid', error: { code: 'TIMEOUT', message: 'mock only' } }));
  let report: RunReport | undefined;
  const code = await evaluateLMStudio([], { probe: async () => ({ ...absent, status: 'AVAILABLE', reason: null, models: [{ id: 'mock-model', digest: null, details: {} }] }), provider: () => ({ extract }), save: r => { report = r; } });
  expect(code).toBe(2); expect(extract).toHaveBeenCalledTimes(8); expect(report!.stages).toMatchObject({ smoke: 'FAIL', fullLiveBenchmark: 'NOT_RUN' });
});
