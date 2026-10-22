import { expect, it } from 'vitest';
import { extract, validate, assertValid } from '../src/index.js';
it.each([null, {}, [], { cards: [], constraints: [] }, { cards: [null], constraints: [], unresolved: [] }])('fails closed on malformed structures: %j', value => {
  expect(validate('check sandbox', value).valid).toBe(false);
  expect(() => assertValid('check sandbox', value)).toThrow();
});
it.each(['title', 'type', 'status', 'requiresConfirmation', 'fields', 'evidence', 'executable'])('rejects tampering with %s', key => {
  const input = 'Check sandbox';
  const result = extract(input);
  Object.assign(result.cards[0]!, { [key]: key === 'requiresConfirmation' ? false : key === 'status' ? 'confirmed' : 'invented' });
  expect(validate(input, result).valid).toBe(false);
});
it('rejects invented recipient email and absolute time', () => {
  for (const [input, fields] of [['Draft an email to Vincent', { recipientEmail: 'vincent@example.org' }], ['明天 review payment webhook', { time: '2030-01-01T09:00:00' }]] as const) {
    const result = extract(input); Object.assign(result.cards[0]!.fields, fields);
    expect(validate(input, result).valid).toBe(false);
  }
});
it('rejects invalid evidence boundaries and forged fragments', () => {
  for (const patch of [{ start: -1 }, { end: 999 }, { start: 0.5 }, { text: 'deploy production' }]) {
    const result = extract('Check sandbox'); Object.assign(result.cards[0]!.evidence, patch);
    expect(validate('Check sandbox', result).valid).toBe(false);
  }
});
it('rejects omitted or inverted prohibition', () => {
  const input = 'Check sandbox, but do not deploy to production.';
  const omitted = extract(input); omitted.constraints = [];
  expect(validate(input, omitted).valid).toBe(false);
  const inverted = extract(input); inverted.constraints[0]!.polarity = 'required';
  expect(validate(input, inverted).valid).toBe(false);
});
it('detects direct conflicts and wildcard prohibitions', () => {
  for (const input of ['Deploy to production, but do not deploy to production.', 'Deploy to staging, 不要 deploy']) {
    const result = validate(input, extract(input));
    expect(result.valid).toBe(false); expect(result.errors).toContain('Card directly conflicts with prohibited action'); expect(result.executable).toBe(false);
  }
});
it('allows different scope and drafting without sending', () => {
  for (const input of ['Deploy to staging, do not deploy to production.', 'Draft an email, but do not send it.']) expect(validate(input, extract(input)).valid).toBe(true);
});
it('rejects duplicate ids, duplicate evidence, omissions and misclassified clauses', () => {
  const input = 'Check sandbox, review payment webhook';
  const duplicate = extract(input); duplicate.cards[1]!.id = duplicate.cards[0]!.id;
  expect(validate(input, duplicate).valid).toBe(false);
  const repeated = extract(input); repeated.cards.push(repeated.cards[0]!);
  expect(validate(input, repeated).valid).toBe(false);
  const missing = extract(input); missing.cards.pop();
  expect(validate(input, missing).valid).toBe(false);
  const moved = extract(input); moved.unresolved.push({ evidence: moved.cards.pop()!.evidence, reason: 'hidden' });
  expect(validate(input, moved).valid).toBe(false);
});
it('valid unresolved content still needs review and is never executable', () => {
  expect(validate('unknown request', extract('unknown request'))).toMatchObject({ valid: true, requiresReview: true, executable: false });
});
it('accepts structurally valid output through assertion', () => {
  expect(() => assertValid('檢查報告', extract('檢查報告'))).not.toThrow();
});
