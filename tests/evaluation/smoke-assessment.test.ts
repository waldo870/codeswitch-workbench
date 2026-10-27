import { expect, it } from 'vitest';
import { assessSmokeCase } from '../../src/evaluation/smoke-assessment.js';
import { runLocal } from '../../src/evaluation/runner.js';
import { loadDataset } from '../../src/evaluation/dataset.js';
import { good } from '../llm/helpers.js';
import type { Proposal } from '../../src/llm/types.js';
async function assess(proposal: Proposal, id = 'en-01') {
  const gold = loadDataset().examples.find(e => e.id === id)!;
  const result = await runLocal([gold], { extract: async sourceInput => ({ sourceInput, proposal, rawText: JSON.stringify(proposal), identity: { provider: 'unit', model: 'unit', digest: null, providerVersion: null }, durationMs: 1, rawValidation: 'valid', error: null }) });
  return assessSmokeCase(gold, result.raw[0]!, result.verified[0]!);
}
it('requires more than schema/evidence or blanket unresolved for full smoke success', async () => {
  const p: Proposal = { cards: [], constraints: [], unresolved: [{ evidence: 'Check sandbox.', reason: 'refuse everything' }] };
  expect(await assess(p)).toMatchObject({ providerPass: true, schemaPass: true, evidencePass: true, semanticPass: false, fullPass: false });
});
it('accepts correct card extraction with applicable checks', async () => {
  const p = good(); p.cards[0]!.evidence = 'Check sandbox';
  expect(await assess(p)).toMatchObject({ providerPass: true, schemaPass: true, evidencePass: true, constraintPass: true, semanticPass: true, fullPass: true });
});
it('does not count omitted prohibition as success even with a correct card and quote', async () => {
  const p = good(); p.cards[0]!.evidence = 'Check sandbox';
  expect(await assess(p, 'constraints-03')).toMatchObject({ schemaPass: true, evidencePass: true, constraintPass: false, semanticPass: false, fullPass: false, constraintFound: 0, constraintTotal: 1 });
});
it('allows appropriate unknown-intent abstention without inventing a task', async () => {
  expect(await assess({ cards: [], constraints: [], unresolved: [{ evidence: '幫我弄一下。', reason: 'clarification needed' }] }, 'ambiguous-02')).toMatchObject({ fullPass: true });
});
