import type { Constraint, Evidence } from '../../contracts/work-card.js';
import type { EditableCard } from '../state/workspace.js';

export const TRANSLATION_SCHEMA_VERSION = 1 as const;
export const TRANSLATION_LOCALES = ['zh-TW', 'en'] as const;
export type TranslationLocale = (typeof TRANSLATION_LOCALES)[number];
export type TranslationRiskKind = 'negation' | 'date' | 'quantity' | 'proper-noun';

export interface TranslationRisk { kind: TranslationRiskKind; text: string }
export interface TranslationRecord {
  schemaVersion: typeof TRANSLATION_SCHEMA_VERSION;
  id: string;
  workspaceId: string;
  cardId: string;
  sourceText: string;
  sourceLocale: string;
  targetLocale: TranslationLocale;
  translatedText: string;
  provenance: {
    providerId: 'deterministic-mock' | 'lmstudio';
    modelId: string;
    generatedAt: string;
    source: 'work-card-title';
    executionMode: 'mock' | 'live';
  };
  sourceEvidence: Evidence;
  constraintsSnapshot: Constraint[];
  risks: TranslationRisk[];
  humanReviewRequired: true;
}

export interface TranslationResult {
  status: 'translated' | 'unavailable';
  record: TranslationRecord | null;
  displayText: string;
  message: string;
}

export interface TranslationProvider {
  readonly providerId: string;
  readonly modelId?: string;
  readonly executionMode?: 'mock' | 'live';
  translate(input: { sourceText: string; targetLocale: TranslationLocale; sourceEvidence?: Evidence; constraints?: Constraint[] }): Promise<string | null>;
}

/** Exact phrase mapping only: this is a UI/provenance prototype, not a language model. */
export class DeterministicMockTranslator implements TranslationProvider {
  readonly providerId = 'deterministic-mock';
  readonly modelId = 'phrasebook-v1';
  readonly executionMode = 'mock' as const;
  async translate({ sourceText, targetLocale }: { sourceText: string; targetLocale: TranslationLocale }): Promise<string | null> {
    const key = sourceText.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    const dictionary: Record<string, Partial<Record<TranslationLocale, string>>> = {
      'review payment webhook': { 'zh-TW': '檢視 payment webhook' },
      'check sandbox credentials': { 'zh-TW': '檢查 sandbox credentials' },
      'prepare english follow-up email to vincent': { 'zh-TW': '準備寄給 Vincent 的英文後續郵件' },
      '檢視 payment webhook': { en: 'Review payment webhook' },
      '檢查 sandbox credentials': { en: 'Check sandbox credentials' },
      '準備寄給 vincent 的英文後續郵件': { en: 'Prepare an English follow-up email to Vincent' },
    };
    return dictionary[key]?.[targetLocale] ?? null;
  }
}

const RISK_PATTERNS: Array<{ kind: TranslationRiskKind; pattern: RegExp }> = [
  { kind: 'negation', pattern: /\b(?:don't|do not|does not|never|not|without|unless|cannot|can't|禁止|不要|不得|不能|除非|不可)\b|(?:不要|不得|不能|除非|不可)/giu },
  { kind: 'date', pattern: /\b(?:today|tomorrow|yesterday|next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday)|\d{4}-\d{1,2}-\d{1,2})\b|(?:今天|明天|後天|昨天|下週|下星期|下個月|\d{1,2}月\d{1,2}日)/giu },
  { kind: 'quantity', pattern: /\b\d+(?:[.,:]\d+)*(?:\s?(?:am|pm|hours?|minutes?|days?|items?|users?|%))?\b|\d+(?:個|件|人|分鐘|小時|天|點|%)?/giu },
  { kind: 'proper-noun', pattern: /\b[A-Z][A-Za-z0-9]*(?:[-'][A-Za-z0-9]+)*(?:\s+[A-Z][A-Za-z0-9]*(?:[-'][A-Za-z0-9]+)*)*\b|\b(?:Vincent|ASUS|Hailo|UGen300|Qwen|Gemma)\b/gu },
];

export function detectTranslationRisks(text: string): TranslationRisk[] {
  const found = new Map<string, TranslationRisk>();
  for (const { kind, pattern } of RISK_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const value = match[0].trim();
      if (value) found.set(`${kind}:${value.toLocaleLowerCase()}`, { kind, text: value });
    }
  }
  return [...found.values()];
}

export function translationId(workspaceId: string, cardId: string, targetLocale: TranslationLocale): string {
  if (!workspaceId || !cardId || /[\\/\u0000-\u001f]/.test(workspaceId + cardId)) throw new Error('Invalid translation source identifier.');
  const id = `${workspaceId}-${cardId}-${targetLocale}`;
  if (id.length > 200) throw new Error('Translation identifier is too long.');
  return id;
}

export function cardTranslationSource(card: EditableCard): string { return card.title; }

export function createTranslationRecord(input: {
  workspaceId: string;
  card: EditableCard;
  targetLocale: TranslationLocale;
  translatedText: string;
  constraints: Constraint[];
  generatedAt?: string;
  provenance?: { providerId: 'deterministic-mock' | 'lmstudio'; modelId: string; executionMode: 'mock' | 'live' };
}): TranslationRecord {
  const sourceText = cardTranslationSource(input.card);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const record: TranslationRecord = {
    schemaVersion: TRANSLATION_SCHEMA_VERSION,
    id: translationId(input.workspaceId, input.card.id, input.targetLocale),
    workspaceId: input.workspaceId,
    cardId: input.card.id,
    sourceText,
    sourceLocale: 'und',
    targetLocale: input.targetLocale,
    translatedText: input.translatedText,
    provenance: { providerId: input.provenance?.providerId ?? 'deterministic-mock', modelId: input.provenance?.modelId ?? 'phrasebook-v1', generatedAt, source: 'work-card-title', executionMode: input.provenance?.executionMode ?? 'mock' },
    sourceEvidence: structuredClone(input.card.evidence),
    constraintsSnapshot: structuredClone(input.constraints),
    risks: detectTranslationRisks(`${sourceText}\n${JSON.stringify(input.card.fields)}\n${input.card.evidence.text}\n${input.constraints.map(c => c.evidence.text).join('\n')}`),
    humanReviewRequired: true,
  };
  validateTranslationRecord(record);
  return record;
}

export function validateTranslationRecord(value: unknown): TranslationRecord {
  if (!value || typeof value !== 'object') throw new Error('Invalid translation record.');
  const r = value as TranslationRecord;
  const exact = (obj: object, keys: string[]) => Object.keys(obj).length === keys.length && keys.every(k => Object.hasOwn(obj, k));
  if (!exact(r, ['schemaVersion','id','workspaceId','cardId','sourceText','sourceLocale','targetLocale','translatedText','provenance','sourceEvidence','constraintsSnapshot','risks','humanReviewRequired']) || r.schemaVersion !== 1 || typeof r.id !== 'string' || r.id.length > 200 || typeof r.workspaceId !== 'string' || typeof r.cardId !== 'string' || typeof r.sourceText !== 'string' || r.sourceText.length > 5000 || r.sourceLocale !== 'und' || !TRANSLATION_LOCALES.includes(r.targetLocale) || typeof r.translatedText !== 'string' || !r.translatedText.trim() || r.translatedText.length > 5000 || r.humanReviewRequired !== true || !r.provenance || !exact(r.provenance, ['providerId','modelId','generatedAt','source','executionMode']) || !['deterministic-mock','lmstudio'].includes(r.provenance.providerId) || typeof r.provenance.modelId !== 'string' || !r.provenance.modelId || r.provenance.modelId.length > 200 || r.provenance.source !== 'work-card-title' || !['mock','live'].includes(r.provenance.executionMode) || (r.provenance.providerId === 'deterministic-mock') !== (r.provenance.executionMode === 'mock') || !Number.isFinite(Date.parse(r.provenance.generatedAt)) || !r.sourceEvidence || !exact(r.sourceEvidence, ['text','start','end']) || typeof r.sourceEvidence.text !== 'string' || !Number.isInteger(r.sourceEvidence.start) || !Number.isInteger(r.sourceEvidence.end) || r.sourceEvidence.start < 0 || r.sourceEvidence.end < r.sourceEvidence.start || !Array.isArray(r.constraintsSnapshot) || !Array.isArray(r.risks)) throw new Error('Invalid or unsupported translation record.');
  if (r.id !== translationId(r.workspaceId, r.cardId, r.targetLocale) || r.risks.some(x => !x || !['negation','date','quantity','proper-noun'].includes(x.kind) || typeof x.text !== 'string')) throw new Error('Translation provenance is invalid.');
  return structuredClone(r);
}

export async function translateCard(input: {
  provider: TranslationProvider;
  workspaceId: string;
  card: EditableCard;
  targetLocale: TranslationLocale;
  constraints: Constraint[];
  now?: () => string;
}): Promise<TranslationResult> {
  const sourceText = cardTranslationSource(input.card);
  try {
    const translatedText = await input.provider.translate({ sourceText, targetLocale: input.targetLocale, sourceEvidence: input.card.evidence, constraints: input.constraints });
    if (!translatedText?.trim()) return { status: 'unavailable', record: null, displayText: sourceText, message: 'No exact mock phrase is available. Showing the original title.' };
    const record = createTranslationRecord({ ...input, translatedText, generatedAt: input.now?.(), provenance: { providerId: input.provider.providerId as 'deterministic-mock' | 'lmstudio', modelId: input.provider.modelId ?? input.provider.providerId, executionMode: input.provider.executionMode ?? 'mock' } });
    return { status: 'translated', record, displayText: record.translatedText, message: 'Mock phrasebook result. Review before use; the Work Card is unchanged.' };
  } catch {
    return { status: 'unavailable', record: null, displayText: sourceText, message: 'Translation is unavailable. Showing the original title.' };
  }
}

/** A stored translation is displayable only while its original card data still matches. */
export function isTranslationCurrent(record: TranslationRecord, card: EditableCard, workspaceId: string, constraints: Constraint[]): boolean {
  try {
    const valid = validateTranslationRecord(record);
    return valid.workspaceId === workspaceId && valid.cardId === card.id && valid.sourceText === card.title && JSON.stringify(valid.sourceEvidence) === JSON.stringify(card.evidence) && JSON.stringify(valid.constraintsSnapshot) === JSON.stringify(constraints);
  } catch { return false; }
}
