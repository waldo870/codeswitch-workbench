import { it, expect, vi } from 'vitest';
import { runResearch } from '../../src/evaluation/research.js';
import { loadDataset } from '../../src/evaluation/dataset.js';
import { good } from '../llm/helpers.js';
import type { ExtractionResult } from '../../src/llm/types.js';
const examples = () => loadDataset().examples.filter(e => ['en-01', 'constraints-03'].includes(e.id));
const result = (): ExtractionResult => ({ sourceInput: 'Check sandbox', identity: { provider: 'mock', model: 'test-only', digest: null, providerVersion: null }, durationMs: 5, rawText: null, proposal: good(), rawValidation: 'valid', error: null });
it('research continues after timeout, reports it outside semantic denominators, never admits product output', async () => {
  const timeout = { ...result(), proposal: null, rawValidation: 'invalid' as const, error: { code: 'TIMEOUT' as const, message: 'mock timeout' } };
  const extract = vi.fn().mockResolvedValueOnce(timeout).mockResolvedValueOnce(result());
  const run = await runResearch(examples(), { extract });
  expect(run.attempted).toBe(2); expect(run.completed).toBe(1); expect(run.providerErrors[0]!.error?.code).toBe('TIMEOUT');
  expect(run.semantic.raw.overall.complete.denominator).toBe(1); expect(run.productAdmission).toBe(false);
  expect(extract.mock.calls[0]![1].caseId).toBe('en-01'); expect(extract.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
});
it('keeps illegal evidence and missing constraints visible while independent verification rejects cards', async () => {
  const r = result(); r.proposal!.cards[0]!.evidence = 'fabricated source';
  const run = await runResearch([examples()[1]!], { extract: async () => r });
  expect(run.assessments[0]!.evidencePass).toBe(false); expect(run.assessments[0]!.constraintPass).toBe(false);
  expect(run.verified[0]!.admittedDraftCards).toEqual([]); expect(run.raw[0]!.rawProposal).toEqual(r.proposal);
});
it('stops at a bounded failure count and checkpoints actual progress', async () => {
  const r = result(); r.proposal = null; r.error = { code: 'INVALID_JSON', message: 'mock invalid JSON' };
  const checkpoint = vi.fn(); const run = await runResearch(examples(), { extract: async () => r }, { maxFailures: 1, checkpoint });
  expect(run.attempted).toBe(1); expect(run.stopReason).toBe('FAILURE_LIMIT'); expect(run.notAttemptedIds).toHaveLength(1); expect(checkpoint).toHaveBeenCalledOnce();
});
it('enforces total deadline and does not retry an expired case', async () => {
  const r = result(); const extract = vi.fn(async () => { await new Promise(resolve => setTimeout(resolve, 10)); return r; });
  const run = await runResearch(examples(), { extract }, { totalMs: 1 });
  expect(extract).toHaveBeenCalledOnce(); expect(run.stopReason).toBe('TOTAL_DEADLINE');
});
it.each([0, -1, NaN, 1.5, 60_001])('rejects invalid per-case budget %s', async perCaseMs => {
  await expect(runResearch(examples(), { extract: async () => result() }, { perCaseMs })).rejects.toThrow('resource limit');
});
it('does not hide schema failures as semantic zeros', async () => {
  const r = result(); r.proposal = null; r.error = { code: 'SCHEMA_MISMATCH', message: 'mock schema' }; r.rawValidation = 'invalid';
  const run = await runResearch([examples()[0]!], { extract: async () => r });
  expect(run.semantic.raw.overall.complete.value).toBeNull(); expect(run.providerErrors).toHaveLength(1);
});

it('stops on runtime loss without inventing scores for remaining examples', async () => {
 const r = result(); r.proposal = null; r.error = { code: 'NETWORK', message: 'mock runtime offline' };
 const extract = vi.fn(async () => r); const run = await runResearch(examples(), { extract });
 expect(extract).toHaveBeenCalledOnce(); expect(run.stopReason).toBe('PROVIDER_UNAVAILABLE'); expect(run.notAttemptedIds).toHaveLength(1);
 expect(run.semantic.raw.overall.complete.value).toBeNull();
});
it('unavailable local provider returns NOT_RUN without writing model scores', async () => {
 const { researchMain } = await import('../../src/evaluation/research-cli.js');
 const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('mock connection refused'));
 const log = vi.spyOn(console, 'error').mockImplementation(() => {});
 try { expect(await researchMain(['--model=not-installed-test-model'])).toBe(2); expect(log.mock.calls.flat().join()).toContain('NOT_RUN'); }
 finally { fetchMock.mockRestore(); log.mockRestore(); }
});
it('research CLI does not accept arbitrary endpoints or ambiguous model selection', async () => {
 const { researchMain } = await import('../../src/evaluation/research-cli.js');
 await expect(researchMain(['--url=http://example.test'])).rejects.toThrow('exactly');
 await expect(researchMain([])).rejects.toThrow('exactly');
});
it('report distinguishes unavailable semantics from zero accuracy and preserves timeout identity', async () => {
 const { researchMarkdown } = await import('../../src/evaluation/research-report.js');
 const { makeReport } = await import('../../src/evaluation/report.js');
 const r = result(); r.proposal = null; r.rawValidation = 'invalid'; r.error = { code: 'TIMEOUT', message: 'mock only' };
 const run = await runResearch([examples()[0]!], { extract: async () => r });
 const md = researchMarkdown({ ...makeReport([]), research: run });
 expect(md).toContain('NOT_EVALUABLE'); expect(md).toContain('en-01'); expect(md).toContain('TIMEOUT'); expect(md).toContain('NOT_ASSESSED');
 expect(md).toContain('60-case benchmark was NOT_RUN');
});
it('checkpoints never claim completion before all examples have been attempted', async () => {
 const states: { attempted: number; reason: string }[] = [];
 const run = await runResearch(examples(), { extract: async () => result() }, { checkpoint: s => { states.push({ attempted: s.attempted, reason: s.stopReason }); } });
 expect(states[0]).toEqual({ attempted: 1, reason: 'IN_PROGRESS' });
 expect(run.stopReason).toBe('DATASET_COMPLETE'); expect(run.attempted).toBe(2);
});
