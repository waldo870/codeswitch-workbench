import { redactDiagnostic, type ProviderDiagnostics } from './diagnostics.js';
import { performance } from 'node:perf_hooks';
import { ProviderError } from './local-transport.js';
import { validateSchema } from './proposal-schema.js';
import type { ExtractionResult, Identity, Proposal } from './types.js';
// Shared decoding and failure policy; provider callbacks supply only transport/envelope logic.
export async function extractUntrustedProposal(input: string, identity: () => Identity, content: () => Promise<string>, signal?: AbortSignal, diagnostics?: ProviderDiagnostics): Promise<ExtractionResult> {
  const start = performance.now(); let rawText: string | null = null;
  try {
    if (typeof input !== 'string' || !input.trim() || input.length > 10000) throw new ProviderError('INVALID_INPUT', 'Input must contain 1–10000 UTF-16 code units.');
    signal?.throwIfAborted();
    rawText = await content();
    if (diagnostics) diagnostics.stage = 'json_parse';
    let proposal: unknown;
    try { proposal = JSON.parse(rawText); } catch { throw new ProviderError('INVALID_JSON', 'Model content is not valid JSON.'); }
    if (diagnostics) diagnostics.stage = 'schema_validation';
    const schema = validateSchema(proposal);
    if (!schema.valid) throw new ProviderError('SCHEMA_MISMATCH', schema.errors.join('; '));
    if (diagnostics) diagnostics.stage = 'complete';
    return { ...(diagnostics ? { diagnostics: { ...diagnostics, contentPreview: null } } : {}), sourceInput: input, identity: { ...identity() }, durationMs: performance.now() - start, rawText, proposal: proposal as Proposal, rawValidation: 'valid', error: null };
  } catch (error) {
    const failure = signal?.aborted ? new ProviderError('TIMEOUT', 'Request aborted by caller.') : error instanceof ProviderError ? error : new ProviderError('NETWORK', 'Local extraction failed.');
    if (diagnostics) { diagnostics.code = failure.code; diagnostics.contentPreview = rawText !== null ? redactDiagnostic(rawText) : diagnostics.contentPreview; }
    const safeRaw = rawText === null ? diagnostics?.contentPreview ?? null : redactDiagnostic(rawText);
    return { ...(diagnostics ? { diagnostics: { ...diagnostics } } : {}), sourceInput: input, identity: { ...identity() }, durationMs: performance.now() - start, rawText: safeRaw, proposal: null, rawValidation: 'invalid', error: { code: failure.code, message: failure.message } };
  }
}
