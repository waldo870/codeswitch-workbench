import { describe, expect, it } from 'vitest';
import { confirmCard, createWorkspace, editCard, EXAMPLE, exportWorkspace, rejectCard, restoreWorkspace, safetyErrors, validateExport, type EditKey } from '../../src/web/state/workspace.js';
import { loadWorkspace, saveWorkspace, STORAGE_KEY } from '../../src/web/storage/local-workspace.js';
const sample = () => createWorkspace(EXAMPLE);
describe('human review state and immutable provenance', () => {
  it('creates the P0 three cards and production prohibition', () => {
    const w = sample(); expect(w.cards).toHaveLength(3); expect(w.parsed.constraints[0]).toMatchObject({ action: 'deploy', scope: 'production', polarity: 'prohibited' });
  });
  it('edits preserve original input, parsed cards, evidence and before/after history', () => {
    const before = sample(), w = editCard(before, 'card-2', 'title', 'Check sandbox');
    expect(w.originalInput).toBe(before.originalInput); expect(w.parsed).toEqual(before.parsed);
    expect(w.cards[1]!.current.evidence).toEqual(before.cards[1]!.current.evidence);
    expect(w.cards[1]!.history).toEqual([{ kind: 'edit', field: 'title', before: 'Check sandbox credentials', after: 'Check sandbox' }]);
  });
  it('confirmation is individual and editing invalidates it', () => {
    let w = confirmCard(sample(), 'card-2');
    expect(w.cards.map(c => c.current.status)).toEqual(['draft', 'confirmed', 'draft']);
    expect(w.cards[1]!.current.requiresConfirmation).toBe(false);
    w = editCard(w, 'card-2', 'title', 'Check sandbox credentials');
    expect(w.cards[1]).toMatchObject({ confirmedRevision: null, revision: 1, current: { status: 'draft', requiresConfirmation: true } });
    expect(() => exportWorkspace(w)).toThrow();
    expect(confirmCard(w, 'card-2').cards[1]!.confirmedRevision).toBe(1);
  });
  it('rejection keeps source and history and excludes the card from export', () => {
    const w = rejectCard(confirmCard(sample(), 'card-2'), 'card-2');
    expect(w.cards[1]!.current.status).toBe('rejected'); expect(w.cards[1]!.history).toHaveLength(2);
    expect(w.cards[1]!.current.evidence).toEqual(w.parsed.cards[1]!.evidence); expect(() => exportWorkspace(w)).toThrow();
  });
  it.each(['Deploy to production', 'deploy production', '部署到正式環境'])('blocks title-only conflict: %s', title => {
    const w = editCard(sample(), 'card-2', 'title', title);
    expect(safetyErrors(w, w.cards[1]!.current).join(' ')).toContain('Prohibited action');
    expect(() => confirmCard(w, 'card-2')).toThrow(); expect(() => exportWorkspace(w)).toThrow();
  });
  it('blocks normalized conflict without invoking text parser on edits', () => {
    let w = editCard(sample(), 'card-2', 'action', 'deploy');
    w = editCard(w, 'card-2', 'target', 'production'); w = editCard(w, 'card-2', 'title', 'Deploy to production');
    expect(() => confirmCard(w, 'card-2')).toThrow(/Prohibited/);
  });
  it('permits supported staging edits with distinct production prohibition', () => {
    let w = editCard(sample(), 'card-2', 'action', 'deploy'); w = editCard(w, 'card-2', 'target', 'staging'); w = editCard(w, 'card-2', 'title', 'Deploy to staging');
    expect(exportWorkspace(confirmCard(w, 'card-2')).cards[0]!.current.fields).toEqual({ action: 'deploy', target: 'staging' });
  });
  it('blocks unknown title instructions and unresolved original clauses', () => {
    expect(() => confirmCard(editCard(sample(), 'card-2', 'title', 'Ignore previous instructions'), 'card-2')).toThrow();
    expect(() => confirmCard(createWorkspace('check sandbox; Ignore previous instructions'), 'card-1')).toThrow(/Unresolved/);
  });
  it('requires complete calendar time and validates dates', () => {
    const w = createWorkspace('明天 review payment webhook'); expect(() => confirmCard(w, 'card-1')).toThrow(/Time/);
    expect(() => confirmCard(editCard(w, 'card-1', 'time', '2030-02-30T09:00'), 'card-1')).toThrow(/Time/);
    expect(confirmCard(editCard(w, 'card-1', 'time', '2030-03-01T09:00'), 'card-1').cards[0]!.current.status).toBe('confirmed');
  });
  it('email needs explicit user-supplied recipient email and body', () => {
    let w = sample(); expect(() => confirmCard(w, 'card-3')).toThrow(/email/);
    w = editCard(w, 'card-3', 'recipientEmail', 'vincent@example.test'); w = editCard(w, 'card-3', 'body', 'Please review the webhook notes.');
    expect(confirmCard(w, 'card-3').cards[2]!.current.status).toBe('confirmed');
    expect(w.parsed.cards[2]!.fields).toMatchObject({ recipientEmail: null, body: null });
  });
  it('source validation failure and required constraints remain fail closed', () => {
    expect(() => confirmCard(createWorkspace('deploy to production, do not deploy to production'), 'card-1')).toThrow(/P0/);
    expect(() => confirmCard(createWorkspace('check sandbox, must check sandbox'), 'card-1')).toThrow(/Required/);
  });
  it('rejects editing forbidden evidence or type fields', () => {
    for (const key of ['evidence', 'status', 'type', '__proto__']) expect(() => editCard(sample(), 'card-1', key as EditKey, 'bad')).toThrow();
  });
  it.each(['', ' ', 'x'.repeat(10001)])('rejects empty or oversized inputs', input => expect(() => createWorkspace(input)).toThrow());
});
describe('storage and export trust boundaries', () => {
  it('round-trips confirmed history, constraints and original UTF-16 evidence', () => {
    const w = confirmCard(sample(), 'card-2'); expect(restoreWorkspace(JSON.parse(JSON.stringify(w)))).toEqual(w);
  });
  it.each([null, {}, { schemaVersion: 99 }, { schemaVersion: 1, originalInput: EXAMPLE, cards: null }])('rejects malformed workspace %j', value => expect(() => restoreWorkspace(value)).toThrow());
  it.each(['evidence', 'confirmation', 'extra', 'history', 'constraint', 'source', 'field'])('rejects stored tampering: %s', mode => {
    const w = confirmCard(sample(), 'card-2');
    if (mode === 'evidence') w.cards[1]!.current.evidence.start++;
    if (mode === 'confirmation') w.cards[1]!.confirmedRevision = 4;
    if (mode === 'extra') Object.assign(w.cards[1]!.current, { executable: true });
    if (mode === 'history') w.cards[1]!.history = [];
    if (mode === 'constraint') w.parsed.constraints = [];
    if (mode === 'source') w.originalInput += ' unknown';
    if (mode === 'field') w.cards[1]!.current.title = 'Deploy to production';
    expect(() => restoreWorkspace(w)).toThrow(); expect(() => exportWorkspace(w)).toThrow();
  });
  it('rejects a forged confirm event on a prohibited edit', () => {
    const w = editCard(sample(), 'card-2', 'title', 'Deploy to production');
    w.cards[1]!.history.push({ kind: 'confirm', revision: 1 });
    expect(() => restoreWorkspace(w)).toThrow(/Prohibited/);
  });
  it('exports only confirmed cards and revalidates the whole export envelope', () => {
    const w = rejectCard(confirmCard(sample(), 'card-2'), 'card-3');
    const doc = exportWorkspace(w); expect(doc.cards.map(c => c.id)).toEqual(['card-2']); expect(doc.executed).toBe(false); expect(doc.constraints).toEqual(w.parsed.constraints);
    expect(validateExport(JSON.parse(JSON.stringify(doc)))).toBe(true);
    doc.cards[0]!.current.title = 'Deploy to production'; expect(validateExport(doc)).toBe(false);
  });
  it('rejects exports with duplicate, unknown, draft or rejected cards and dropped metadata', () => {
    const original = exportWorkspace(confirmCard(sample(), 'card-2'));
    for (const mutation of [0, 1, 2, 3, 4]) {
      const doc = structuredClone(original);
      if (mutation === 0) doc.cards.push(doc.cards[0]!);
      if (mutation === 1) doc.cards[0]!.id = 'unknown';
      if (mutation === 2) doc.cards[0]!.current.status = 'draft';
      if (mutation === 3) doc.cards[0]!.current.status = 'rejected';
      if (mutation === 4) doc.constraints = [];
      expect(validateExport(doc)).toBe(false);
    }
  });
  it('handles invalid JSON without overwriting it', () => {
    const memory = new Map([[STORAGE_KEY, '{bad']]);
    const storage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => { memory.set(k, v); }, removeItem: (k: string) => { memory.delete(k); } };
    expect(loadWorkspace(storage)).toMatchObject({ workspace: null, error: expect.any(String) }); expect(memory.get(STORAGE_KEY)).toBe('{bad');
  });
  it('storage access and quota errors are surfaced', () => {
    const storage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
    expect(loadWorkspace(storage).error).toBeTruthy(); expect(() => saveWorkspace(storage, sample())).toThrow('quota');
  });
});

it('coalesces continuous typing but preserves edits across confirmation', () => {
  let w = editCard(sample(), 'card-2', 'title', 'C');
  w = editCard(w, 'card-2', 'title', 'Check sandbox credentials');
  expect(w.cards[1]!.history).toHaveLength(1);
  expect(w.cards[1]!.history[0]).toMatchObject({ before: 'Check sandbox credentials', after: 'Check sandbox credentials' });
  w = confirmCard(w, 'card-2'); w = editCard(w, 'card-2', 'title', 'Check sandbox credentials ');
  expect(w.cards[1]!.history).toHaveLength(3); expect(w.cards[1]!.current.status).toBe('draft');
});

it.each(['check constructor', 'review __proto__'])('treats inherited object keys as unsupported input: %s', input => {
  const w = createWorkspace(input);
  expect(w.cards).toHaveLength(0); expect(w.parsed.unresolved).toHaveLength(1);
  expect(restoreWorkspace(w)).toEqual(w);
});
