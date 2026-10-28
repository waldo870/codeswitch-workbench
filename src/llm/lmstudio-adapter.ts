import { windowsWslEndpoint } from './windows-wsl-endpoint.js';
import { newDiagnostics, redactDiagnostic } from './diagnostics.js';
import { boundedJsonRequest, loopbackEndpoint, ProviderError, type TransportOptions } from './local-transport.js';
import { extractUntrustedProposal } from './proposal-extraction.js';
import { proposalSchema } from './proposal-schema.js';
import { SYSTEM_PROMPT } from './ollama-adapter.js';
import type { ExtractionProvider, ExtractOptions, Identity } from './types.js';
export const LMSTUDIO_ENDPOINT = 'http://127.0.0.1:1234';
export const LMSTUDIO_PARAMETERS = { temperature: 0, seed: 42, max_tokens: 4096 };
export const lmstudioEndpoint = (value = LMSTUDIO_ENDPOINT, windowsWslHost?: string) => windowsWslHost === undefined ? loopbackEndpoint(value, true) : windowsWslEndpoint(value, windowsWslHost);
export function lmstudioRequest(path: '/v1/models' | '/v1/chat/completions', body: unknown, options: TransportOptions = {}, signal?: AbortSignal) {
  if (!['/v1/models', '/v1/chat/completions'].includes(path)) throw new Error('Unsupported LM Studio path.');
  return boundedJsonRequest(lmstudioEndpoint(options.endpoint, options.windowsWslHost), path, body, options, signal, 'LM Studio');
}
export interface LocalModel { id: string; digest: string | null; details: Record<string, unknown> }
export interface LMStudioProbe { status: 'AVAILABLE' | 'NOT_RUN'; version: string | null; models: LocalModel[]; reason: string | null }
export async function probeLMStudio(options: TransportOptions = {}, signal?: AbortSignal): Promise<LMStudioProbe> {
  try {
    const result = await lmstudioRequest('/v1/models', undefined, { ...options, timeoutMs: options.timeoutMs ?? 3000 }, signal) as { data?: unknown };
    if (!result || !Array.isArray(result.data)) throw new ProviderError('PROVIDER_FORMAT', 'Invalid model inventory.');
    const models = result.data.filter((m): m is Record<string, unknown> => Boolean(m && typeof m.id === 'string' && m.id.length <= 200 && !/[\x00-\x1f]|cloud/i.test(m.id) && !m.remote_host && !m.remote_model)).map(m => ({
      id: m.id as string, digest: typeof m.digest === 'string' ? m.digest : null,
      details: Object.fromEntries(['owned_by', 'type', 'arch', 'quantization', 'state', 'max_context_length'].filter(k => typeof m[k] === 'string' || typeof m[k] === 'number').map(k => [k, m[k]])),
    }));
    return { status: models.length ? 'AVAILABLE' : 'NOT_RUN', version: null, models, reason: models.length ? null : 'No eligible local model IDs advertised.' };
  } catch (error) { return { status: 'NOT_RUN', version: null, models: [], reason: error instanceof ProviderError ? `${error.code}: ${error.message}` : 'Local LM Studio discovery failed.' }; }
}
export class LMStudioAdapter implements ExtractionProvider {
  private identity: Identity;
  private ready: Promise<void> | null = null;
  constructor(private model: string, private options: TransportOptions = {}) {
    lmstudioEndpoint(options.endpoint, options.windowsWslHost);
    if (!model || model.length > 200 || /[\x00-\x1f]|cloud/i.test(model)) throw new Error('Use an advertised local model ID.');
    this.identity = { provider: 'lmstudio', model, digest: null, providerVersion: null };
  }
  private async initialize(signal?: AbortSignal, onResponse?: (status: number) => void) {
    const probe = await probeLMStudio({ ...this.options, onResponse }, signal), selected = probe.models.find(m => m.id === this.model);
    if (!selected) throw new ProviderError('MODEL_UNAVAILABLE', probe.reason ?? 'Model is not in local inventory.');
    this.identity = { ...this.identity, digest: selected.digest, details: selected.details, providerVersion: probe.version };
  }
  async extract(input: string, options: ExtractOptions = {}) {
    const diagnostics = newDiagnostics('lmstudio', this.model, options.caseId);
    const requestOptions = { ...this.options, onResponse: (status: number) => { diagnostics.httpStatus = status; this.options.onResponse?.(status); } };
    return extractUntrustedProposal(input, () => this.identity, async () => {
      diagnostics.stage = 'discovery';
      await (this.ready ??= this.initialize(options.signal, requestOptions.onResponse));
      diagnostics.httpStatus = null; diagnostics.stage = 'transport';
      const envelope = await lmstudioRequest('/v1/chat/completions', {
        model: this.model, stream: false, ...LMSTUDIO_PARAMETERS,
        response_format: { type: 'json_schema', json_schema: { name: 'codeswitch_extraction', strict: true, schema: proposalSchema } },
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: input }],
      }, requestOptions, options.signal) as { usage?: Record<string, unknown>; model?: unknown; choices?: { finish_reason?: unknown; message?: { content?: unknown; refusal?: unknown; tool_calls?: unknown } }[] };
      diagnostics.stage = 'provider_envelope';
      const choice = envelope?.choices?.[0];
      diagnostics.finishReason = typeof choice?.finish_reason === 'string' ? redactDiagnostic(choice.finish_reason, 50) : null;
      diagnostics.contentPreview = typeof choice?.message?.content === 'string' ? redactDiagnostic(choice.message.content) : null;
      diagnostics.usage = envelope?.usage && typeof envelope.usage === 'object' ? Object.fromEntries(Object.entries(envelope.usage).filter(([key, v]) => ['prompt_tokens', 'completion_tokens', 'total_tokens'].includes(key) && typeof v === 'number' && Number.isFinite(v))) as Record<string, number> : null;
      const tools = choice?.message?.tool_calls;
      const invalidTools = tools != null && (!Array.isArray(tools) || tools.length > 0);
      if (!Array.isArray(envelope?.choices) || !choice || envelope.choices.length !== 1 || choice.finish_reason !== 'stop' || choice.message?.refusal || invalidTools || typeof choice.message?.content !== 'string') throw new ProviderError('PROVIDER_FORMAT', 'Expected one completed text proposal without tool calls or refusal.');
      if (typeof envelope.model === 'string' && envelope.model !== this.model) throw new ProviderError('PROVIDER_FORMAT', 'Response model differs from requested identity.');
      return choice.message.content;
    }, options.signal, diagnostics);
  }
}
