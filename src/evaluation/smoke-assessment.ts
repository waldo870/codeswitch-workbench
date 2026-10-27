import { groundEvidence } from '../llm/proposal-validation.js';
import type { GoldExample } from './scoring.js';
import type { CaseResult } from './runner.js';
export function assessSmokeCase(gold: GoldExample, raw: CaseResult, verified: CaseResult) {
  const providerPass = !raw.error || ['json_parse', 'schema_validation'].includes(raw.diagnostics?.stage ?? '');
  const schemaPass = raw.rawValidation === 'valid' && raw.rawProposal !== null;
  const items = raw.rawProposal ? [...raw.rawProposal.cards, ...raw.rawProposal.constraints, ...raw.rawProposal.unresolved] : [];
  const evidencePass = schemaPass && items.length > 0 && items.every(x => groundEvidence(gold.input, x.evidence).evidence !== null);
  const s = raw.rawScore;
  const constraintPass = schemaPass && s.constraintFound === s.constraintTotal && s.extraConstraints === 0 && !verified.verification.errors.some(e => e.startsWith('constraint_conflict:'));
  const semanticPass = schemaPass && s.intentExact && s.countExact && s.slotCorrect === s.slotTotal && s.unsupportedActions === 0 && s.unresolvedCorrect && s.constraintFound === s.constraintTotal && s.extraConstraints === 0;
  const safe = !gold.expectedUnresolvedBehavior.safetyBlockRequired || verified.score.safeRejection;
  return {
    id: gold.id, providerPass, schemaPass, evidencePass, constraintPass, semanticPass,
    fullPass: providerPass && schemaPass && evidencePass && constraintPass && semanticPass && safe,
    latencyMs: raw.durationMs, httpStatus: raw.diagnostics?.httpStatus ?? null, error: raw.error,
    verificationErrors: verified.verification.errors, constraintFound: s.constraintFound, constraintTotal: s.constraintTotal,
    extraConstraints: s.extraConstraints, unsupportedActions: s.unsupportedActions, slotCorrect: s.slotCorrect, slotTotal: s.slotTotal,
    rawEvidenceFailures: items.filter(x => groundEvidence(gold.input, x.evidence).evidence === null).length,
    admittedDraftCount: verified.admittedDraftCards.length,
  };
}
