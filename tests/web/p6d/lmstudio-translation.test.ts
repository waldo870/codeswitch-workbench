import { expect, it, vi } from 'vitest';
import { LMStudioTranslationProvider } from '../../../src/web/p6d/lmstudio-translation.js';

function response(value: unknown, status = 200): Response { return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } }); }
function localModel() { return response({ data: [{ id: 'local-test-model', digest: 'test-digest' }] }); }
function translation(content: string, model = 'local-test-model', extra: Record<string, unknown> = {}) {
  return response({ model, choices: [{ finish_reason: 'stop', message: { content, ...extra } }] });
}

it('uses local model discovery and a JSON Schema request with no arbitrary endpoint or cloud call', async () => {
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(localModel()).mockResolvedValueOnce(translation('{"translatedText":"檢視 payment webhook"}'));
  const provider = new LMStudioTranslationProvider('local-test-model', { endpoint: 'http://127.0.0.1:1234', fetchImpl });
  const result = await provider.translate({ sourceText: 'Review payment webhook', targetLocale: 'zh-TW', sourceEvidence: { text: 'review payment webhook', start: 0, end: 22 }, constraints: [] });
  expect(result).toBe('檢視 payment webhook');
  const request = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body));
  expect(request).toMatchObject({ model: 'local-test-model', stream: false, temperature: 0, response_format: { type: 'json_schema', json_schema: { strict: true, schema: { additionalProperties: false } } } });
  expect(String(fetchImpl.mock.calls[1]?.[0])).toBe('http://127.0.0.1:1234/v1/chat/completions');
  expect(request.messages[1].content).toContain('sourceEvidence');
  expect(provider.executionMode).toBe('live');
});

it('rejects arbitrary remote endpoints and invalid model identifiers before requests', () => {
  expect(() => new LMStudioTranslationProvider('local-model', { endpoint: 'https://example.invalid' })).toThrow(/loopback|Windows endpoint/i);
  expect(() => new LMStudioTranslationProvider('cloud-model')).toThrow(/advertised local model/i);
});

it('rejects missing local model, provider refusal, tools, and response model mismatch', async () => {
  const missing = new LMStudioTranslationProvider('missing', { endpoint: 'http://127.0.0.1:1234', fetchImpl: vi.fn<typeof fetch>().mockResolvedValueOnce(response({ data: [{ id: 'other' }] })) });
  await expect(missing.translate({ sourceText: 'Review payment webhook', targetLocale: 'zh-TW' })).rejects.toMatchObject({ code: 'MODEL_UNAVAILABLE' });
  for (const [payload, model] of [
    [translation('{"translatedText":"x"}', 'local-test-model', { refusal: 'refused' }), 'local-test-model'],
    [translation('{"translatedText":"x"}', 'local-test-model', { tool_calls: [{ id: 'tool' }] }), 'local-test-model'],
    [translation('{"translatedText":"x"}', 'different-model'), 'different-model'],
  ] as const) {
    const provider = new LMStudioTranslationProvider('local-test-model', { endpoint: 'http://127.0.0.1:1234', fetchImpl: vi.fn<typeof fetch>().mockResolvedValueOnce(localModel()).mockResolvedValueOnce(payload) });
    await expect(provider.translate({ sourceText: 'Review payment webhook', targetLocale: 'zh-TW' })).rejects.toMatchObject({ code: 'PROVIDER_FORMAT' });
  }
});

it('rejects invalid JSON, schema mismatch, HTTP errors and connection failure', async () => {
  const invalidJson = new LMStudioTranslationProvider('local-test-model', { endpoint: 'http://127.0.0.1:1234', fetchImpl: vi.fn<typeof fetch>().mockResolvedValueOnce(localModel()).mockResolvedValueOnce(translation('not-json')) });
  await expect(invalidJson.translate({ sourceText: 'Review payment webhook', targetLocale: 'zh-TW' })).rejects.toMatchObject({ code: 'INVALID_JSON' });
  const invalidSchema = new LMStudioTranslationProvider('local-test-model', { endpoint: 'http://127.0.0.1:1234', fetchImpl: vi.fn<typeof fetch>().mockResolvedValueOnce(localModel()).mockResolvedValueOnce(translation('{"translatedText":"x","extra":true}')) });
  await expect(invalidSchema.translate({ sourceText: 'Review payment webhook', targetLocale: 'zh-TW' })).rejects.toMatchObject({ code: 'SCHEMA_MISMATCH' });
  const httpError = new LMStudioTranslationProvider('local-test-model', { endpoint: 'http://127.0.0.1:1234', fetchImpl: vi.fn<typeof fetch>().mockResolvedValueOnce(response({ data: [] }, 503)) });
  await expect(httpError.translate({ sourceText: 'Review payment webhook', targetLocale: 'zh-TW' })).rejects.toMatchObject({ code: 'HTTP_ERROR' });
  const offline = new LMStudioTranslationProvider('local-test-model', { endpoint: 'http://127.0.0.1:1234', fetchImpl: vi.fn<typeof fetch>().mockRejectedValue(new TypeError('connection refused')) });
  await expect(offline.translate({ sourceText: 'Review payment webhook', targetLocale: 'zh-TW' })).rejects.toMatchObject({ code: 'NETWORK' });
});

it('surfaces local provider timeout without retrying', async () => {
  const slow: typeof fetch = (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
  });
  const fetchImpl = vi.fn(slow);
  const provider = new LMStudioTranslationProvider('local-test-model', { endpoint: 'http://127.0.0.1:1234', fetchImpl, timeoutMs: 5 });
  await expect(provider.translate({ sourceText: 'Review payment webhook', targetLocale: 'zh-TW' })).rejects.toMatchObject({ code: 'TIMEOUT' });
  expect(fetchImpl).toHaveBeenCalledOnce();
});
