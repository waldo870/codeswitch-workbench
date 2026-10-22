import type { Extraction } from '../contracts/work-card.js';
import { interpret, segments } from './rules.js';
export interface Validation { valid: boolean; errors: string[]; requiresReview: boolean; executable: false }
const object = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
function equal(a: unknown, b: unknown): boolean {
  if (object(a) && object(b)) return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => equal(a[k], b[k]));
  return a === b;
}
// Does not invoke the extraction adapter. Reconciles every source clause against the public grammar.
export function validate(input: string, value: unknown): Validation {
  const errors: string[] = [];
  const finish = (review = true): Validation => ({ valid: errors.length === 0, errors, requiresReview: review || errors.length > 0, executable: false });
  if (!object(value) || !Array.isArray(value.cards) || !Array.isArray(value.constraints) || !Array.isArray(value.unresolved) || Object.keys(value).length !== 3) {
    errors.push('Invalid extraction schema'); return finish();
  }
  const source = segments(input);
  const used = new Set<number>();
  const ids = new Set<string>();
  for (const [kind, items] of [['cards', value.cards], ['constraints', value.constraints], ['unresolved', value.unresolved]] as const) {
    for (const item of items) {
      if (!object(item) || !object(item.evidence)) { errors.push('Missing evidence'); continue; }
      const ev = item.evidence;
      const index = source.findIndex(s => equal(s, ev));
      if (!Number.isInteger(ev.start) || !Number.isInteger(ev.end) || typeof ev.text !== 'string' || index < 0 || input.slice(ev.start as number, ev.end as number) !== ev.text || used.has(index)) { errors.push('Invalid, duplicate or unsupported evidence span'); continue; }
      used.add(index);
      const meaning = interpret(ev.text);
      if (kind === 'cards') {
        if (!meaning || !('card' in meaning)) { errors.push('Card lacks supported affirmative source'); continue; }
        if (typeof item.id !== 'string' || !item.id || ids.has(item.id)) errors.push('Invalid or duplicate card ID');
        ids.add(String(item.id));
        if (item.status !== 'draft' || item.requiresConfirmation !== true) errors.push('Baseline only accepts draft cards requiring confirmation');
        const expected = { ...meaning.card, id: item.id, status: 'draft', requiresConfirmation: true, evidence: ev };
        if (!equal(item, expected)) errors.push('Card schema or fields unsupported by source (including invented information)');
      } else if (kind === 'constraints') {
        if (!meaning || !('constraint' in meaning) || !equal(item, { ...meaning.constraint, evidence: ev })) errors.push('Invalid constraint or polarity');
      } else if (meaning || typeof item.reason !== 'string' || !item.reason.trim() || Object.keys(item).length !== 2) errors.push('Invalid unresolved segment');
    }
  }
  if (used.size !== source.length) errors.push('Source clauses omitted, including possible prohibitions');
  // Require each recognized clause to appear in the correct collection, even if evidence was present elsewhere.
  for (const ev of source) {
    const meaning = interpret(ev.text);
    const list = meaning ? ('constraint' in meaning ? value.constraints : value.cards) : value.unresolved;
    if (!list.some(x => object(x) && equal(x.evidence, ev))) errors.push('Missing source intent or constraint');
  }
  for (const constraint of value.constraints) for (const card of value.cards) {
    if (object(constraint) && object(card) && object(card.fields) && constraint.polarity === 'prohibited' && constraint.action === card.fields.action && (constraint.scope === '*' || constraint.scope === card.fields.target)) errors.push('Card directly conflicts with prohibited action');
  }
  return finish(value.cards.length > 0 || value.unresolved.length > 0 || value.constraints.length > 0);
}
export function assertValid(input: string, value: unknown): asserts value is Extraction {
  const report = validate(input, value);
  if (!report.valid) throw new Error(report.errors.join('; '));
}
