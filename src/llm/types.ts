import type { ProviderDiagnostics } from './diagnostics.js';
import type { WorkCard, Evidence } from '../contracts/work-card.js';
export type CardType = WorkCard['type'];
type SourceCard<T> = T extends WorkCard ? Pick<T, 'type' | 'title' | 'fields'> & { intent: CardType; evidence: string; status?: string; requiresConfirmation?: boolean } : never;
export type ProposalCard = SourceCard<WorkCard>;
export interface ProposalConstraint { action: string; polarity: 'prohibited' | 'required' | 'prerequisite'; scope: string; dependsOn: string | null; evidence: string }
export interface Proposal { cards: ProposalCard[]; constraints: ProposalConstraint[]; unresolved: { evidence: string; reason: string }[] }
export type FailureCode = 'INVALID_INPUT' | 'NETWORK' | 'TIMEOUT' | 'HTTP_ERROR' | 'RESPONSE_TOO_LARGE' | 'INVALID_JSON' | 'SCHEMA_MISMATCH' | 'PROVIDER_FORMAT' | 'MODEL_UNAVAILABLE';
export interface Identity { provider: string; model: string; digest: string | null; providerVersion: string | null; details?: unknown; license?: string | null }
export interface ExtractionResult {
  diagnostics?: ProviderDiagnostics;
  sourceInput: string; identity: Identity; durationMs: number; rawText: string | null;
  proposal: Proposal | null; rawValidation: 'valid' | 'invalid'; error: { code: FailureCode; message: string } | null;
}
export interface ExtractOptions { signal?: AbortSignal; caseId?: string }
export interface ExtractionProvider { extract(input: string, options?: ExtractOptions): Promise<ExtractionResult> }
export interface Verification {
  valid: boolean; errors: string[]; reviewRequired: true; executable: false;
  draftCards: WorkCard[]; groundedConstraints: (Omit<ProposalConstraint, 'evidence'> & { evidence: Evidence })[];
  groundedUnresolved: { evidence: Evidence; reason: string }[];
}
