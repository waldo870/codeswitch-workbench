import { expect, it } from 'vitest';
import { aggregate, percentile, scoreExample, type GoldExample } from '../../src/evaluation/scoring.js';
import { good, taskCard } from '../llm/helpers.js';
import { loadDataset } from '../../src/evaluation/dataset.js';
const gold: GoldExample = { id: 'test', input: 'check sandbox', group: 'unit', languageCategory: 'en', difficultyTags: [], expectedIntentTypes: ['task'], expectedCardCount: 1, expectedSlots: [{ type: 'task', slots: { action: 'check', target: 'sandbox' } }], expectedConstraints: [], expectedUnresolvedBehavior: { segmentRequired: false, safetyBlockRequired: false } };
it('scores exact semantic success with explicit denominators', () => {
  const score = scoreExample(gold, good(), false), s = aggregate([score], [10]);
  expect(score.complete).toBe(true); expect(s.slots).toEqual({ numerator: 2, denominator: 2, value: 1 });
  expect(s.constraintRecall).toEqual({ numerator: 0, denominator: 0, value: null });
  expect(s.unsupportedActionRate).toEqual({ numerator: 0, denominator: 1, value: 0 });
  expect(s.evidenceValidity.value).toBe(1);
});
it('failure is not zero-card success; blanket refusal is not completion', () => {
  const emptyGold = { ...gold, expectedCardCount: 0, expectedIntentTypes: [], expectedSlots: [] };
  expect(scoreExample(emptyGold, null, true).countExact).toBe(false);
  expect(scoreExample(gold, { cards: [], constraints: [], unresolved: [{ evidence: gold.input, reason: 'refuse' }] }, true).complete).toBe(false);
});
it('missing cards count all expected slots as wrong', () => {
  const score = scoreExample(gold, { cards: [], constraints: [], unresolved: [] }, false);
  expect(score.slotTotal).toBe(2); expect(score.slotCorrect).toBe(0); expect(score.countExact).toBe(false);
});
it('duplicate and invented actions count as unsupported with predicted-card denominator', () => {
  const p = good(); p.cards.push(taskCard());
  expect(scoreExample(gold, p, false)).toMatchObject({ unsupportedActions: 1, proposedActions: 2, countExact: false });
  p.cards[0] = { ...taskCard(), fields: { action: 'deploy', target: 'production' } };
  expect(scoreExample(gold, p, false).unsupportedActions).toBe(1);
});
it('constraint recall uses gold constraints, preserves omission errors after rejection', () => {
  const g = { ...gold, expectedConstraints: [{ action: 'deploy', scope: 'production', polarity: 'prohibited' as const, dependsOn: null }], expectedUnresolvedBehavior: { segmentRequired: false, safetyBlockRequired: true } };
  const score = scoreExample(g, good(), true);
  expect(score.constraintFound).toBe(0); expect(score.constraintTotal).toBe(1); expect(score.safeRejection).toBe(true); expect(score.complete).toBe(false);
});
it('wrong polarity and extra constraints cannot count as success', () => {
  const p = good(); p.constraints.push({ action: 'deploy', scope: 'production', polarity: 'required', dependsOn: null, evidence: 'check sandbox' });
  expect(scoreExample(gold, p, false).extraConstraints).toBe(1); expect(scoreExample(gold, p, false).complete).toBe(false);
});
it('safe rejection is defined only on eligible cases and excludes provider failures', () => {
  const g = { ...gold, expectedUnresolvedBehavior: { segmentRequired: false, safetyBlockRequired: true } };
  expect(aggregate([scoreExample(g, null, true)]).safeRejection).toEqual({ numerator: 0, denominator: 1, value: 0 });
  expect(aggregate([scoreExample(gold, good(), true)]).safeRejection.value).toBeNull();
});
it('schema correctness does not imply semantic or evidence correctness', () => {
  const p = good(); p.cards[0]!.evidence = 'not in source';
  const score = scoreExample(gold, p, false); expect(score.intentExact).toBe(true); expect(score.evidenceValid).toBe(0); expect(score.complete).toBe(false);
});
it('allows trusted baseline indices for repeated text but requires unique model quotes', () => {
  const g = { ...gold, input: 'check sandbox; check sandbox' };
  expect(scoreExample(g, good(), false).evidenceValid).toBe(0);
  expect(scoreExample(g, good(), false, [{ text: 'check sandbox', start: 0, end: 13 }]).evidenceValid).toBe(1);
});
it('matches reordered cards once and does not reward extra copies', () => {
  const g = { ...gold, input: 'check sandbox; review 報告', expectedCardCount: 2, expectedSlots: [...gold.expectedSlots, { type: 'task', slots: { action: 'review', target: '報告' } }] };
  const p = good(); p.cards.unshift({ intent: 'task', type: 'task', title: 'Review 報告', fields: { action: 'review', target: '報告' }, evidence: 'review 報告' });
  expect(scoreExample(g, p, false).complete).toBe(true);
});
it('uses nearest-rank latency quantiles and N/A for no samples', () => {
  expect(percentile([], 0.5)).toBeNull(); expect(percentile([1, 2, 3, 4], 0.5)).toBe(2); expect(percentile([1, 2, 3, 4], 0.95)).toBe(4);
});
it('freezes dataset version/hash, category counts and manually reviewable slots', () => {
  const d = loadDataset(); expect(d.version).toBe('benchmark-v1.0.0'); expect(d.hash).toBe('d0ada927031c7d88bfc0088b95e54d0d597e85e7dd1924732be14b8768767c94');
  expect(d.examples).toHaveLength(60);
  expect(Object.fromEntries(['zh', 'en', 'mixed', 'multi', 'constraints', 'ambiguous'].map(g => [g, d.examples.filter(e => e.group === g).length]))).toEqual({ zh: 10, en: 10, mixed: 15, multi: 10, constraints: 10, ambiguous: 5 });
  expect(d.examples.every(e => e.expectedSlots.length === e.expectedCardCount && e.difficultyTags.length)).toBe(true);
});
it('does not apply relative-time aliases to target names', () => {
  const g = { ...gold, input: 'check tomorrow', expectedSlots: [{ type: 'task', slots: { action: 'check', target: 'tomorrow' } }] };
  const p = good(); if (p.cards[0]!.type === 'task') p.cards[0]!.fields.target = '明天'; p.cards[0]!.evidence = 'check tomorrow';
  expect(scoreExample(g, p, false).slotCorrect).toBe(1);
  expect(scoreExample(g, p, false).unsupportedActions).toBe(1);
});
it('retains relative-time equivalence specifically for the time slot', () => {
  const g = { ...gold, input: '明天早上九點 review 報告', expectedIntentTypes: ['calendar'], expectedSlots: [{ type: 'calendar', slots: { action: 'review', target: '報告', time: 'Tomorrow, 9:00 AM' } }] };
  const p = { cards: [{ intent: 'calendar' as const, type: 'calendar' as const, title: 'Review 報告', fields: { action: 'review', target: '報告', time: '明天早上九點' }, evidence: g.input }], constraints: [], unresolved: [] };
  expect(scoreExample(g, p, false).slotCorrect).toBe(3);
});
