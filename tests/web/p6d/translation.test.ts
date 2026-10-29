import { expect, it } from 'vitest';
import { createWorkspace, EXAMPLE } from '../../../src/web/state/workspace.js';
import { cardTranslationSource, createTranslationRecord, detectTranslationRisks, DeterministicMockTranslator, isTranslationCurrent, translateCard, translationId, validateTranslationRecord } from '../../../src/web/p6d/translation.js';

const workspaceId = '12345678-1234-4234-8234-123456789abc';
const workspace = createWorkspace(EXAMPLE);
const card = workspace.cards[0]!.current;

it('creates a versioned separate translation with provider, model, timestamp, locale and source provenance', () => {
  const result = createTranslationRecord({ workspaceId, card, targetLocale: 'zh-TW', translatedText: '檢視 payment webhook', constraints: workspace.parsed.constraints, generatedAt: '2026-10-30T00:00:00.000Z' });
  expect(result).toMatchObject({ schemaVersion: 1, workspaceId, cardId: card.id, sourceText: card.title, sourceLocale: 'und', targetLocale: 'zh-TW', translatedText: '檢視 payment webhook', humanReviewRequired: true, provenance: { providerId: 'deterministic-mock', modelId: 'phrasebook-v1', generatedAt: '2026-10-30T00:00:00.000Z', source: 'work-card-title', executionMode: 'mock' } });
  expect(validateTranslationRecord(result)).toEqual(result);
  expect(translationId(workspaceId, card.id, 'zh-TW')).toBe(result.id);
});

it('keeps source card, evidence, constraints, and confirmation state immutable', async () => {
  const before = structuredClone(workspace);
  const result = await translateCard({ provider: new DeterministicMockTranslator(), workspaceId, card, targetLocale: 'zh-TW', constraints: workspace.parsed.constraints, now: () => '2026-10-30T00:00:00.000Z' });
  expect(result.status).toBe('translated');
  expect(result.record?.sourceEvidence).toEqual(card.evidence);
  expect(result.record?.constraintsSnapshot).toEqual(workspace.parsed.constraints);
  expect(result.record?.risks).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'negation' }), expect.objectContaining({ kind: 'proper-noun' })]));
  expect(workspace).toEqual(before);
  expect(workspace.cards[0]!.current.status).toBe('draft');
  expect(workspace.cards[0]!.confirmedRevision).toBeNull();
  expect(result.record).not.toHaveProperty('status');
});

it('falls back to the exact original title when the mock has no phrase or provider throws', async () => {
  const noMatch = await translateCard({ provider: new DeterministicMockTranslator(), workspaceId, card: { ...card, title: 'Unrecognized arbitrary instruction' }, targetLocale: 'zh-TW', constraints: workspace.parsed.constraints });
  expect(noMatch).toMatchObject({ status: 'unavailable', record: null, displayText: 'Unrecognized arbitrary instruction' });
  const unavailable = await translateCard({ provider: { providerId: 'test', translate: async () => { throw new Error('unavailable'); } }, workspaceId, card, targetLocale: 'zh-TW', constraints: workspace.parsed.constraints });
  expect(unavailable.displayText).toBe(cardTranslationSource(card));
  expect(unavailable.record).toBeNull();
});

it('flags negation, dates, quantities and proper nouns for human review', () => {
  const risks = detectTranslationRisks("Don't deploy to production tomorrow at 9:00 AM; Vincent requested 3 reports.");
  expect(risks.map(risk => risk.kind)).toEqual(expect.arrayContaining(['negation','date','quantity','proper-noun']));
  expect(risks.some(risk => risk.text.toLowerCase().includes("don't"))).toBe(true);
  expect(detectTranslationRisks('明天不要發布 3 個項目給 Vincent')).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: 'negation' }), expect.objectContaining({ kind: 'date' }), expect.objectContaining({ kind: 'quantity' }), expect.objectContaining({ kind: 'proper-noun' }),
  ]));
});

it('does not treat stale source provenance as current after card or constraint changes', () => {
  const record = createTranslationRecord({ workspaceId, card, targetLocale: 'zh-TW', translatedText: '檢視 payment webhook', constraints: workspace.parsed.constraints });
  expect(isTranslationCurrent(record, card, workspaceId, workspace.parsed.constraints)).toBe(true);
  expect(isTranslationCurrent(record, { ...card, title: 'Edited title' }, workspaceId, workspace.parsed.constraints)).toBe(false);
  expect(isTranslationCurrent(record, card, workspaceId, [])).toBe(false);
  expect(isTranslationCurrent(record, card, 'different-workspace', workspace.parsed.constraints)).toBe(false);
});

it('rejects forged provider provenance and modified evidence in a stored translation', () => {
  const record = createTranslationRecord({ workspaceId, card, targetLocale: 'zh-TW', translatedText: '檢視 payment webhook', constraints: workspace.parsed.constraints });
  expect(() => validateTranslationRecord({ ...record, provenance: { ...record.provenance, providerId: 'cloud-ai' } })).toThrow(/translation record/i);
  expect(() => validateTranslationRecord({ ...record, sourceEvidence: { ...record.sourceEvidence, text: 'forged' } })).not.toThrow();
  expect(isTranslationCurrent({ ...record, sourceEvidence: { ...record.sourceEvidence, text: 'forged' } }, card, workspaceId, workspace.parsed.constraints)).toBe(false);
});
