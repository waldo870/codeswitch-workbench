import { expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runBaseline, runLocal, summarize } from '../../src/evaluation/runner.js';
import { loadDataset } from '../../src/evaluation/dataset.js';
import { collectReports, makeReport, markdown, saveReport } from '../../src/evaluation/report.js';
import { chooseModels } from '../../src/evaluation/cli.js';
import { good } from '../llm/helpers.js';
import type { ExtractionResult } from '../../src/llm/types.js';
const fixture = () => loadDataset().examples.find(x => x.id === 'en-01')!;
const result = (): ExtractionResult => {
  const proposal = good(); proposal.cards[0]!.evidence = 'Check sandbox';
  return { sourceInput: fixture().input, identity: { provider: 'mock-unit-test', model: 'not-a-real-model', digest: null, providerVersion: null }, durationMs: 5, rawText: JSON.stringify(proposal), proposal, rawValidation: 'valid', error: null };
};
it('baseline uses the actual P0 parser and validator', async () => {
  const cases = await runBaseline([fixture()]); expect(cases[0]!.rawProposal?.cards).toHaveLength(1); expect(cases[0]!.identity.provider).toBe('deterministic'); expect(cases[0]!.score.complete).toBe(true);
});
it('B and C share one extraction; only input reaches the provider', async () => {
  const extract = vi.fn(async () => result()); const runs = await runLocal([fixture()], { extract });
  expect(extract).toHaveBeenCalledExactlyOnceWith(fixture().input); expect(runs.raw[0]!.rawText).toBe(runs.verified[0]!.rawText);
  expect(runs.raw[0]!.admittedDraftCards).toEqual([]); expect(runs.verified[0]!.admittedDraftCards).toHaveLength(1);
});
it('records raw omission and independent interception without replacing model errors', async () => {
  const gold = loadDataset().examples.find(x => x.id === 'constraints-03')!;
  const r = result(); r.proposal!.cards[0]!.evidence = 'Check sandbox';
  const runs = await runLocal([gold], { extract: async () => r });
  expect(runs.raw[0]!.score.constraintFound).toBe(0);
  expect(runs.verified[0]!.verification.errors.join()).toContain('omitted_constraint');
  expect(runs.verified[0]!.admittedDraftCards).toEqual([]); expect(runs.verified[0]!.rawScore.constraintFound).toBe(0);
});
it('counts provider failures as failures, not semantic rejection successes', async () => {
  const r = result(); r.proposal = null; r.rawValidation = 'invalid'; r.error = { code: 'TIMEOUT', message: 'mock timeout' };
  const runs = await runLocal([fixture()], { extract: async () => r });
  const s = summarize(runs.raw); expect(s.timeoutCount).toBe(1); expect(s.overall.complete.value).toBe(0); expect(runs.verified[0]!.score.safeRejection).toBe(false);
});
it('records NOT_RUN with null scores, never synthesized model results', () => {
  const report = makeReport([{ method: 'B', model: 'none', status: 'NOT_RUN', reason: 'Ollama absent', cases: [], summary: null }]);
  expect(markdown(report)).toContain('NOT_RUN'); expect(report.methods[0]!.summary).toBeNull(); expect(report.methods[0]!.cases).toEqual([]);
});
it('saves JSON/Markdown and aggregates only existing results without model calls', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'csw-eval-test-'));
  try {
    const cases = await runBaseline(loadDataset().examples);
    const report = makeReport([{ method: 'A', model: 'p0-rules', status: 'RUN', reason: null, cases, summary: summarize(cases) }]);
    saveReport('baseline', report, directory);
    const merged = collectReports(directory); expect(merged.methods[0]!.summary).toEqual(report.methods[0]!.summary);
    expect(readFileSync(join(directory, 'baseline.md'), 'utf8')).toContain('Failed example IDs');
    expect(() => saveReport('../escape', report, directory)).toThrow();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
it('selects at most two installed models, prefers Qwen, never downloads', () => {
  const probe = { status: 'AVAILABLE' as const, version: 'test', reason: null, models: [
    { name: 'other', digest: 'x', size: 1 }, { name: 'qwen-small', digest: 'a', size: 2 }, { name: 'qwen-medium', digest: 'b', size: 4 }, { name: 'qwen-large', digest: 'c', size: 8 },
  ] };
  expect(chooseModels(probe)).toEqual(['qwen-small', 'qwen-large']);
  expect(() => chooseModels(probe, ['absent'])).toThrow(); expect(() => chooseModels(probe, ['other', 'qwen-small', 'qwen-medium'])).toThrow();
  expect(chooseModels({ ...probe, models: [probe.models[1]!] })).toEqual(['qwen-small']);
});
