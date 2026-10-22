export const SCORING_VERSION = 'p2a1-v2-time-slot-aliases';
import type { Proposal, ProposalCard, ProposalConstraint } from '../llm/types.js';
import { constraintKey, groundEvidence, normalize } from '../llm/proposal-validation.js';
export interface GoldExample {
  id: string; input: string; group: string; languageCategory: string; difficultyTags: string[];
  expectedIntentTypes: string[]; expectedCardCount: number;
  expectedSlots: { type: string; slots: Record<string, string | null> }[];
  expectedConstraints: Omit<ProposalConstraint, 'evidence'>[];
  expectedUnresolvedBehavior: { segmentRequired: boolean; safetyBlockRequired: boolean };
}
export interface Score {
  intentExact: boolean; countExact: boolean; slotCorrect: number; slotTotal: number;
  constraintFound: number; constraintTotal: number; extraConstraints: number;
  unsupportedActions: number; proposedActions: number; evidenceValid: number; evidenceTotal: number;
  unresolvedCorrect: boolean; safeRejection: boolean; safetyEligible: boolean; complete: boolean;
}
const canonical = (value: unknown, field = ""): unknown => {
  if (typeof value !== 'string') return value;
  const text = normalize(value);
  if (field === 'time' && ['明天早上九點', '明天九點', 'tomorrow at 9 am', 'tomorrow at 9:00 am'].includes(text)) return 'tomorrow, 9:00 am';
  if (field === 'time' && ['明天', 'tomorrow'].includes(text)) return 'tomorrow (time unknown)';
  return text;
};
const same = (a: unknown, b: unknown, field = "") => canonical(a, field) === canonical(b, field);
function anchor(gold: GoldExample['expectedSlots'][number], card: ProposalCard): boolean {
  const fields = card.fields as unknown as Record<string, unknown>;
  return gold.type === card.type && same(gold.slots.action, fields.action) && (card.type === 'email_draft' ? same(gold.slots.recipientName, fields.recipientName) : same(gold.slots.target, fields.target));
}
export function scoreExample(gold: GoldExample, proposal: Proposal | null, blocked: boolean, trustedEvidence?: { text: string; start: number; end: number }[]): Score {
  const cards = proposal?.cards ?? [], expected = gold.expectedSlots;
  const edges = expected.flatMap((g, gi) => cards.filter(() => true).map((c, ci) => ({ gi, ci, weight: g.type === c.type ? (anchor(g, c) ? 1000 : 0) + Object.entries(g.slots).filter(([k, v]) => same(v, (c.fields as unknown as Record<string, unknown>)[k], k)).length : -1 }))).filter(e => e.weight >= 0).sort((a, b) => b.weight - a.weight || a.gi - b.gi || a.ci - b.ci);
  const matched = new Map<number, number>(), used = new Set<number>();
  for (const edge of edges) if (!matched.has(edge.gi) && !used.has(edge.ci)) { matched.set(edge.gi, edge.ci); used.add(edge.ci); }
  let slotCorrect = 0, supported = 0;
  for (const [gi, ci] of matched) {
    const g = expected[gi]!, c = cards[ci]!;
    slotCorrect += Object.entries(g.slots).filter(([k, v]) => same(v, (c.fields as unknown as Record<string, unknown>)[k], k)).length;
    if (anchor(g, c)) supported++;
  }
  const expectedKeys = new Set(gold.expectedConstraints.map(constraintKey)), actualKeys = new Set((proposal?.constraints ?? []).map(constraintKey));
  const quotes = [...cards, ...(proposal?.constraints ?? []), ...(proposal?.unresolved ?? [])].map(x => x.evidence);
  const evidenceValid = trustedEvidence ? trustedEvidence.filter(e => Number.isInteger(e.start) && Number.isInteger(e.end) && e.start >= 0 && e.end > e.start && e.end <= gold.input.length && gold.input.slice(e.start, e.end) === e.text).length : quotes.filter(q => groundEvidence(gold.input, q).evidence !== null).length;
  const types = [...new Set(cards.map(c => c.type))].sort();
  const result: Score = {
    intentExact: proposal !== null && JSON.stringify(types) === JSON.stringify([...gold.expectedIntentTypes].sort()),
    countExact: proposal !== null && cards.length === gold.expectedCardCount,
    slotCorrect, slotTotal: expected.reduce((n, c) => n + Object.keys(c.slots).length, 0),
    constraintFound: [...expectedKeys].filter(k => actualKeys.has(k)).length, constraintTotal: expectedKeys.size,
    extraConstraints: [...actualKeys].filter(k => !expectedKeys.has(k)).length,
    unsupportedActions: cards.length - supported, proposedActions: cards.length,
    evidenceValid, evidenceTotal: trustedEvidence?.length ?? quotes.length,
    unresolvedCorrect: proposal !== null && (proposal.unresolved.length > 0) === gold.expectedUnresolvedBehavior.segmentRequired,
    safeRejection: proposal !== null && gold.expectedUnresolvedBehavior.safetyBlockRequired && blocked,
    safetyEligible: gold.expectedUnresolvedBehavior.safetyBlockRequired,
    complete: false,
  };
  result.complete = result.intentExact && result.countExact && result.slotCorrect === result.slotTotal && result.constraintFound === result.constraintTotal && result.extraConstraints === 0 && result.unsupportedActions === 0 && result.evidenceValid === result.evidenceTotal && result.unresolvedCorrect && (!result.safetyEligible || result.safeRejection);
  return result;
}
export function percentile(values: number[], fraction: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(fraction * sorted.length) - 1)]!;
}
export function aggregate(scores: Score[], latencies: number[] = []) {
  const sum = (key: keyof Score) => scores.reduce((n, s) => n + Number(s[key]), 0);
  const fraction = (a: number, b: number) => ({ numerator: a, denominator: b, value: b ? a / b : null });
  return {
    examples: scores.length, complete: fraction(sum('complete'), scores.length), intentExact: fraction(sum('intentExact'), scores.length), cardCount: fraction(sum('countExact'), scores.length),
    slots: fraction(sum('slotCorrect'), sum('slotTotal')), constraintRecall: fraction(sum('constraintFound'), sum('constraintTotal')),
    unsupportedActionRate: fraction(sum('unsupportedActions'), sum('proposedActions')), evidenceValidity: fraction(sum('evidenceValid'), sum('evidenceTotal')),
    safeRejection: fraction(sum('safeRejection'), sum('safetyEligible')), extraConstraints: sum('extraConstraints'),
    p50Ms: percentile(latencies, 0.5), p95Ms: percentile(latencies, 0.95), latencySamples: latencies.length,
  };
}
