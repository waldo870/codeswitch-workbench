import type { FailureCode } from './types.js';
export const DIAGNOSTIC_LIMIT = 2048;
export type FailureStage = 'input' | 'discovery' | 'transport' | 'provider_envelope' | 'json_parse' | 'schema_validation' | 'complete';
export interface ProviderDiagnostics {
  provider: string; model: string; caseId: string | null; httpStatus: number | null;
  stage: FailureStage; code: FailureCode | null; finishReason: string | null;
  contentPreview: string | null; usage: Record<string, number> | null;
}
const sensitive = /authorization|cookie|password|passwd|secret|api.?key|token/i;
// Diagnostics are local-only, bounded and never parsed into a proposal or WorkCard.
export function redactDiagnostic(value: string, limit = DIAGNOSTIC_LIMIT): string {
  let text = value;
  function clean(v: unknown, depth = 0): unknown {
    if (depth > 12) return '[REDACTED_DEPTH]';
    if (Array.isArray(v)) return v.map(x => clean(x, depth + 1));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [sensitive.test(k) ? '[REDACTED_KEY]' : k, sensitive.test(k) ? '[REDACTED]' : clean(x, depth + 1)]));
    return v;
  }
  try { text = JSON.stringify(clean(JSON.parse(value))); } catch { /* malformed text still receives pattern redaction */ }
  text = text.replace(/(?:Bearer\s+|sk-|ghp_|github_pat_|AKIA)[A-Za-z0-9._/+=-]+/gi, '[REDACTED]')
    .replace(/((?:authorization|password|passwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token)["']?\s*[:=]\s*)(?:"(?:\\.|[^"\\])*"|'[^']*'|[^\s,;}]+)/gi, '$1[REDACTED]');
  return text.length > limit ? text.slice(0, limit) + '[TRUNCATED]' : text;
}
export function newDiagnostics(provider: string, model: string, caseId?: string): ProviderDiagnostics {
  return { provider: redactDiagnostic(provider, 100), model: redactDiagnostic(model, 200), caseId: caseId ? redactDiagnostic(caseId, 100) : null, httpStatus: null, stage: 'input', code: null, finishReason: null, contentPreview: null, usage: null };
}
