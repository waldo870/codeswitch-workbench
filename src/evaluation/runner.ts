import { performance } from 'node:perf_hooks';
import { extract } from '../engine/extract.js';
import { validate } from '../engine/validate.js';
import { missingRequired, verifyProposal } from '../llm/proposal-validation.js';
import type { ExtractionProvider, ExtractionResult, Proposal, ProposalCard } from '../llm/types.js';
import { aggregate, scoreExample, type GoldExample, type Score } from './scoring.js';
export interface CaseResult {
  diagnostics?: ExtractionResult['diagnostics'];
  id: string; group: string; sourceInput: string; durationMs: number; rawValidation: 'valid' | 'invalid'; error: ExtractionResult['error'];
  rawText: string | null; rawProposal: Proposal | null; finalProposal: Proposal | null; rawScore: Score; score: Score;
  verification: { valid: boolean; errors: string[]; executable: false }; admittedDraftCards: unknown[]; identity: ExtractionResult['identity'];
}
function blocked(p: Proposal | null, validationValid: boolean): boolean { return !p || !validationValid || p.unresolved.length > 0 || p.cards.some(missingRequired) || (p.cards.length === 0 && p.constraints.length > 0); }
export async function runBaseline(examples: GoldExample[]): Promise<CaseResult[]> {
  return examples.map(gold => {
    const start = performance.now(), raw = extract(gold.input), report = validate(gold.input, raw);
    const proposal: Proposal = { cards: raw.cards.map(c => ({ intent: c.type, type: c.type, title: c.title, fields: c.fields, evidence: c.evidence.text }) as ProposalCard), constraints: raw.constraints.map(c => ({ ...c, dependsOn: null, evidence: c.evidence.text })), unresolved: raw.unresolved.map(u => ({ ...u, evidence: u.evidence.text })) };
    const finalProposal = report.valid ? proposal : { ...proposal, cards: [], unresolved: [{ evidence: gold.input, reason: report.errors.join('; ') }] };
    const spans = [...raw.cards, ...raw.constraints, ...raw.unresolved].map(c => c.evidence);
    return { id: gold.id, group: gold.group, sourceInput: gold.input, durationMs: performance.now() - start, rawValidation: 'valid', error: null, rawText: JSON.stringify(raw), rawProposal: proposal, finalProposal,
      rawScore: scoreExample(gold, proposal, blocked(proposal, report.valid), spans), score: scoreExample(gold, finalProposal, blocked(finalProposal, report.valid), report.valid ? spans : undefined),
      verification: { valid: report.valid, errors: report.errors, executable: false }, admittedDraftCards: report.valid ? raw.cards : [], identity: { provider: 'deterministic', model: 'p0-rules', digest: null, providerVersion: 'P1 baseline' } };
  });
}
export async function runLocal(examples: GoldExample[], provider: ExtractionProvider): Promise<{ raw: CaseResult[]; verified: CaseResult[] }> {
  const raw: CaseResult[] = [], verified: CaseResult[] = [];
  for (const gold of examples) {
    // Gold labels never cross the extraction interface.
    const result = await provider.extract(gold.input);
    const verificationStart = performance.now();
    const review = result.proposal ? verifyProposal(gold.input, result.proposal) : null;
    const verificationDuration = performance.now() - verificationStart;
    const schemaScore = scoreExample(gold, result.proposal, blocked(result.proposal, Boolean(result.proposal)));
    const finalProposal: Proposal | null = result.proposal && review ? {
      cards: review.draftCards.map(c => ({ intent: c.type, type: c.type, title: c.title, fields: c.fields, evidence: c.evidence.text }) as ProposalCard),
      constraints: review.groundedConstraints.map(c => ({ ...c, evidence: c.evidence.text })),
      unresolved: review.valid ? [] : [{ evidence: gold.input, reason: review.errors.join('; ') }],
    } : null;
    const base = { ...(result.diagnostics ? { diagnostics: { ...result.diagnostics, caseId: gold.id } } : {}), id: gold.id, group: gold.group, sourceInput: gold.input, durationMs: result.durationMs, rawValidation: result.rawValidation, error: result.error, rawText: result.rawText, rawProposal: result.proposal, rawScore: schemaScore, identity: result.identity };
    raw.push({ ...base, finalProposal: result.proposal, score: schemaScore, verification: { valid: Boolean(result.proposal), errors: result.error ? [result.error.code] : [], executable: false }, admittedDraftCards: [] });
    verified.push({ ...base, durationMs: result.durationMs + verificationDuration, finalProposal, score: scoreExample(gold, finalProposal, !review?.valid || blocked(finalProposal, Boolean(finalProposal))), verification: { valid: review?.valid ?? false, errors: review?.errors ?? [result.error?.code ?? 'provider_error'], executable: false }, admittedDraftCards: review?.draftCards ?? [] });
  }
  return { raw, verified };
}
export function summarize(cases: CaseResult[]) {
  return {
    overall: aggregate(cases.map(c => c.score), cases.map(c => c.durationMs)), rawOverall: aggregate(cases.map(c => c.rawScore)),
    categories: Object.fromEntries([...new Set(cases.map(c => c.group))].map(group => { const subset = cases.filter(c => c.group === group); return [group, aggregate(subset.map(c => c.score), subset.map(c => c.durationMs))]; })),
    failedIds: cases.filter(c => !c.score.complete).map(c => c.id),
    constraintErrors: cases.filter(c => c.rawScore.constraintFound < c.rawScore.constraintTotal || c.rawScore.extraConstraints).map(c => c.id),
    unsupportedActions: cases.filter(c => c.rawScore.unsupportedActions).map(c => ({ id: c.id, count: c.rawScore.unsupportedActions })),
    interceptedIds: cases.filter(c => c.rawProposal && !c.verification.valid).map(c => c.id),
    invalidJsonCount: cases.filter(c => c.error?.code === 'INVALID_JSON').length,
    schemaFailureCount: cases.filter(c => c.error?.code === 'SCHEMA_MISMATCH').length,
    timeoutCount: cases.filter(c => c.error?.code === 'TIMEOUT').length,
    providerFailureCount: cases.filter(c => c.error).length,
    admittedDraftCount: cases.reduce((n, c) => n + c.admittedDraftCards.length, 0),
  };
}
