import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { extract, validate } from '../src/index.js';
const scenarios = JSON.parse(readFileSync(new URL('./fixtures/scenarios.json', import.meta.url), 'utf8')) as { name: string; input: string; types: string[]; constraints: number; unresolved: number }[];
describe('original deterministic fixtures', () => {
  it.each(scenarios)('$name', scenario => {
    const result = extract(scenario.input);
    expect(result.cards.map(c => c.type)).toEqual(scenario.types);
    expect(result.constraints).toHaveLength(scenario.constraints);
    expect(result.unresolved).toHaveLength(scenario.unresolved);
    expect(validate(scenario.input, result).valid).toBe(true);
    for (const item of [...result.cards, ...result.constraints, ...result.unresolved]) expect(scenario.input.slice(item.evidence.start, item.evidence.end)).toBe(item.evidence.text);
    for (const card of result.cards) { expect(card.status).toBe('draft'); expect(card.requiresConfirmation).toBe(true); }
    expect(extract(scenario.input)).toEqual(result);
  });
});
it('demo has exact intended fields and independent prohibition', () => {
  const input = scenarios.find(s => s.name === 'demo')!.input;
  const result = extract(input);
  expect(result.cards.map(c => c.title)).toEqual(['Review payment webhook', 'Check sandbox credentials', 'Prepare English follow-up email to Vincent']);
  expect(result.cards[0]!.fields).toEqual({ action: 'review', target: 'payment webhook', time: 'Tomorrow, 9:00 AM' });
  expect(result.cards[2]!.fields).toEqual({ action: 'draft', recipientName: 'Vincent', recipientEmail: null, language: 'English', body: null });
  expect(result.constraints[0]).toMatchObject({ action: 'deploy', scope: 'production', polarity: 'prohibited', evidence: { text: "don't deploy to production yet" } });
});
it('retains missing time and relative dates', () => {
  expect(extract('明天 review payment webhook').cards[0]!.fields).toMatchObject({ time: 'Tomorrow (time unknown)' });
  expect(extract('Remind me to review deployment plan').cards[0]!.fields).toMatchObject({ time: null });
});
it('never turns unsupported qualifiers or negation into affirmative actions', () => {
  for (const input of ['check sandbox unless approved', '不要 review payment webhook', 'maybe deploy to production', 'review payment webhook at 11 pm']) {
    expect(extract(input).cards).toEqual([]);
    expect(extract(input).unresolved).toHaveLength(1);
  }
});
