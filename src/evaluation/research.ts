import type { ExtractionProvider } from '../llm/types.js';
import { runLocal, summarize, type CaseResult } from './runner.js';
import { assessSmokeCase } from './smoke-assessment.js';
import { percentile, type GoldExample } from './scoring.js';
export interface ResearchSnapshot {
  attemptLatency: { p50Ms: number | null; p95Ms: number | null; samples: number }; timeoutCount: number; schemaFailureCount: number; invalidJsonCount: number; mode: 'research'; productAdmission: false; stopReason: string; requested: number; attempted: number; completed: number; notAttemptedIds: string[]; limits: { totalMs: number; perCaseMs: number; maxFailures: number }; elapsedMs: number; raw: CaseResult[]; verified: CaseResult[]; semantic: { raw: ReturnType<typeof summarize>; verified: ReturnType<typeof summarize> }; providerErrors: { id: string; error: CaseResult['error']; durationMs: number }[]; assessments: ReturnType<typeof assessSmokeCase>[];
}
export const RESEARCH_LIMITS = { totalMs: 65 * 60_000, perCaseMs: 60_000, maxFailures: 60 } as const;
/** Research never changes validation or returns product cards. Provider errors remain non-semantic outcomes. */
export async function runResearch(examples: GoldExample[], provider: ExtractionProvider, options: {
  totalMs?: number; perCaseMs?: number; maxFailures?: number;
  checkpoint?: (snapshot: ResearchSnapshot) => void;
} = {}) {
  const limits = { ...RESEARCH_LIMITS, ...options };
  for (const key of ['totalMs', 'perCaseMs', 'maxFailures'] as const) {
    if (!Number.isInteger(limits[key]) || limits[key] < 1 || limits[key] > RESEARCH_LIMITS[key]) throw new Error('Invalid research resource limit.');
  }
  const started = performance.now();
  const raw: CaseResult[] = [], verified: CaseResult[] = [];
  let failures = 0;
  let stopReason = 'IN_PROGRESS';
  for (const gold of examples) {
    const remaining = limits.totalMs - (performance.now() - started);
    if (remaining <= 0) { stopReason = 'TOTAL_DEADLINE'; break; }
    if (failures >= limits.maxFailures) { stopReason = 'FAILURE_LIMIT'; break; }
    const signal = AbortSignal.timeout(Math.max(1, Math.ceil(Math.min(remaining, limits.perCaseMs))));
    const result = await runLocal([gold], { extract: input => provider.extract(input, { signal, caseId: gold.id }) });
    raw.push(result.raw[0]!); verified.push(result.verified[0]!);
    if (result.raw[0]!.error) failures++;
    options.checkpoint?.(snapshot());
    if (['NETWORK', 'MODEL_UNAVAILABLE'].includes(result.raw[0]!.error?.code ?? '')) { stopReason = 'PROVIDER_UNAVAILABLE'; break; }
  }
  if (raw.length === examples.length) stopReason = 'DATASET_COMPLETE';
  return snapshot();
  function snapshot(): ResearchSnapshot {
    const completedRaw = raw.filter(c => !c.error), completedVerified = verified.filter(c => !c.error);
    return { attemptLatency: { p50Ms: percentile(raw.map(c => c.durationMs), 0.5), p95Ms: percentile(raw.map(c => c.durationMs), 0.95), samples: raw.length }, timeoutCount: raw.filter(c => c.error?.code === 'TIMEOUT').length, schemaFailureCount: raw.filter(c => c.error?.code === 'SCHEMA_MISMATCH').length, invalidJsonCount: raw.filter(c => c.error?.code === 'INVALID_JSON').length, mode: 'research' as const, productAdmission: false as const, stopReason,
      requested: examples.length, attempted: raw.length, completed: completedRaw.length,
      notAttemptedIds: examples.slice(raw.length).map(e => e.id),
      limits: { totalMs: limits.totalMs, perCaseMs: limits.perCaseMs, maxFailures: limits.maxFailures },
      elapsedMs: performance.now() - started,
      // Legacy all-attempted scores retained for audit, never presented as semantic accuracy.
      raw: [...raw], verified: [...verified],
      semantic: { raw: summarize(completedRaw), verified: summarize(completedVerified) },
      providerErrors: raw.filter(c => c.error).map(c => ({ id: c.id, error: c.error, durationMs: c.durationMs })),
      assessments: raw.map((c, i) => assessSmokeCase(examples.find(e => e.id === c.id)!, c, verified[i]!)),
    };
  }
}
