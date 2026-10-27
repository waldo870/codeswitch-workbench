import { expect, it, vi } from 'vitest';
import { LMStudioAdapter, probeLMStudio, lmstudioEndpoint, LMSTUDIO_PARAMETERS } from '../../src/llm/lmstudio-adapter.js';
import { verifyProposal, scanConstraints } from '../../src/llm/proposal-validation.js';
import { proposalSchema } from '../../src/llm/proposal-schema.js';
import { good } from './helpers.js';
function transport(chat?: (init?: RequestInit) => Promise<Response>): typeof fetch {
  return (async (url, init) => String(url).endsWith('/v1/models') ? Response.json({ data: [{ id: 'mock-local', owned_by: 'unit-test', quantization: 'mock-Q4', digest: 'mock-digest' }] }) : chat ? chat(init) : Response.json({ model: 'mock-local', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(good()) } }] })) as typeof fetch;
}
it('sends LM Studio JSON Schema format using shared fixed prompt and bounds', async () => {
  const fetchImpl = vi.fn(transport());
  const r = await new LMStudioAdapter('mock-local', { fetchImpl }).extract('check sandbox');
  expect(r.rawValidation).toBe('valid'); expect(r.identity).toMatchObject({ provider: 'lmstudio', digest: 'mock-digest', providerVersion: null });
  const [url, init] = fetchImpl.mock.calls.at(-1)!; expect(url).toBe('http://127.0.0.1:1234/v1/chat/completions');
  const body = JSON.parse(init!.body as string);
  expect(body).toMatchObject({ model: 'mock-local', stream: false, ...LMSTUDIO_PARAMETERS, response_format: { type: 'json_schema', json_schema: { name: 'codeswitch_extraction', strict: true, schema: proposalSchema } } });
  expect(body.messages[1]).toEqual({ role: 'user', content: 'check sandbox' }); expect(init!.redirect).toBe('error'); expect(init!.signal).toBeInstanceOf(AbortSignal);
  expect(init!.headers).not.toHaveProperty('Authorization');
});
it.each([
  ['bad JSON', 'oops', 'INVALID_JSON'], ['schema mismatch', '{}', 'SCHEMA_MISMATCH'],
])('%s produces no proposal', async (_, text, code) => {
  const fetchImpl = transport(async () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: text } }] }));
  const r = await new LMStudioAdapter('mock-local', { fetchImpl }).extract('check sandbox'); expect(r.error?.code).toBe(code); expect(r.proposal).toBeNull();
});
it.each([
  { choices: [{ finish_reason: 'length', message: { content: '{}' } }] },
  { choices: [{ finish_reason: 'stop', message: { content: '{}', tool_calls: [{}] } }] },
  { choices: [{ finish_reason: 'stop', message: { content: '{}', refusal: 'no' } }] },
  { model: 'different-model', choices: [{ finish_reason: 'stop', message: { content: '{}' } }] },
  { choices: [] },
])('rejects incomplete/refused/mismatched provider output', async envelope => {
  const r = await new LMStudioAdapter('mock-local', { fetchImpl: transport(async () => Response.json(envelope)) }).extract('check sandbox');
  expect(r.error?.code).toBe('PROVIDER_FORMAT');
});
it('bounds response bytes and distinguishes HTTP failure', async () => {
  const huge = await new LMStudioAdapter('mock-local', { maxResponseBytes: 500, fetchImpl: transport(async () => new Response('x'.repeat(501))) }).extract('check sandbox'); expect(huge.error?.code).toBe('RESPONSE_TOO_LARGE');
  const http = await new LMStudioAdapter('mock-local', { fetchImpl: transport(async () => new Response('', { status: 401 })) }).extract('check sandbox'); expect(http.error).toEqual({ code: 'HTTP_ERROR', message: 'LM Studio HTTP 401' });
});
it('honors timeout and caller abort', async () => {
  const fetchImpl = transport(init => new Promise((_, reject) => init!.signal!.addEventListener('abort', () => reject(new Error('aborted')))));
  const r = await new LMStudioAdapter('mock-local', { fetchImpl, timeoutMs: 10 }).extract('check sandbox'); expect(r.error?.code).toBe('TIMEOUT');
  const controller = new AbortController(); controller.abort(); const mock = vi.fn(transport());
  expect((await new LMStudioAdapter('mock-local', { fetchImpl: mock }).extract('check sandbox', { signal: controller.signal })).error?.code).toBe('TIMEOUT'); expect(mock).not.toHaveBeenCalled();
});
it('reports refusal/empty inventory as NOT_RUN without fake scores', async () => {
  expect(await probeLMStudio({ fetchImpl: async () => { throw new Error('ECONNREFUSED secret input'); } })).toMatchObject({ status: 'NOT_RUN', models: [], reason: 'NETWORK: Local LM Studio connection failed.' });
  expect((await probeLMStudio({ fetchImpl: async () => Response.json({ data: [] }) })).status).toBe('NOT_RUN');
});
it('refuses unadvertised or cloud model IDs without chat requests', async () => {
  const mock = vi.fn(transport()); expect((await new LMStudioAdapter('absent', { fetchImpl: mock }).extract('check sandbox')).error?.code).toBe('MODEL_UNAVAILABLE'); expect(mock).toHaveBeenCalledTimes(1); expect(() => new LMStudioAdapter('x:cloud')).toThrow();
});
it.each(['http://192.168.1.2:1234', 'http://0.0.0.0:1234', 'https://example.test', 'http://127.0.0.1@evil.test', 'http://localhost:1234/path', 'http://localhost:1234?url=evil'])('refuses unsafe endpoint %s', value => expect(() => lmstudioEndpoint(value)).toThrow());
it('maps localhost to literal loopback and supports IPv6 loopback', () => {
  expect(lmstudioEndpoint('http://localhost:1234')).toBe('http://127.0.0.1:1234'); expect(lmstudioEndpoint('http://[::1]:1234')).toBe('http://[::1]:1234');
});
it('normalizes raw confirmation claims only after independent validation', async () => {
  const p = good(); p.cards[0]!.status = 'confirmed'; p.cards[0]!.requiresConfirmation = false;
  const r = await new LMStudioAdapter('mock-local', { fetchImpl: transport(async () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(p) } }] })) }).extract('check sandbox');
  const checked = verifyProposal('check sandbox', r.proposal); expect(checked.draftCards[0]).toMatchObject({ status: 'draft', requiresConfirmation: true });
});
it.each(["Don't deploy to production.", "Don't delete the logs.", 'Do not send the email.', 'Only prepare a draft.', 'Unless I confirm, do not publish.'])('independently detects omitted restrictions: %s', input => {
  const report = verifyProposal(input, { cards: [], constraints: [], unresolved: [] }); expect(report.errors.join()).toContain('omitted_constraint'); expect(report.draftCards).toEqual([]);
});
it('detects English confirmation dependency and permits two nonconflicting reviews', () => {
  expect(scanConstraints('Unless I confirm, do not publish.')).toEqual(expect.arrayContaining([expect.objectContaining({ polarity: 'prerequisite', dependsOn: 'user confirmation' })]));
  const p = good(); p.cards[0]!.evidence = 'Check sandbox'; p.cards.push({ intent: 'task', type: 'task', title: 'Review production settings', fields: { action: 'review', target: 'production settings' }, evidence: 'review production settings' });
  expect(verifyProposal('Check sandbox, then review production settings.', p).draftCards).toHaveLength(2);
});
it.each([undefined, null, []].map(tool_calls => ({ tool_calls })))('accepts missing/null/empty tool_calls: %j', async ({ tool_calls }) => {
  const r = await new LMStudioAdapter('mock-local', { fetchImpl: transport(async () => Response.json({ model: 'mock-local', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(good()), ...(tool_calls === undefined ? {} : { tool_calls }) } }] })) }).extract('check sandbox', { caseId: 'unit-01' });
  expect(r.rawValidation).toBe('valid'); expect(r.proposal).not.toBeNull(); expect(r.diagnostics).toMatchObject({ provider: 'lmstudio', model: 'mock-local', caseId: 'unit-01', httpStatus: 200, stage: 'complete', code: null });
});
it.each([[{ id: 'call', type: 'function', function: { name: 'send', arguments: '{}' } }], {}, '', '[]', false, 0].map(tool_calls => ({ tool_calls })))('rejects real calls and invalid tool_calls types: %j', async ({ tool_calls }) => {
  const r = await new LMStudioAdapter('mock-local', { fetchImpl: transport(async () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(good()), tool_calls } }] })) }).extract('check sandbox');
  expect(r.error?.code).toBe('PROVIDER_FORMAT'); expect(r.proposal).toBeNull(); expect(r.diagnostics).toMatchObject({ stage: 'provider_envelope', httpStatus: 200, code: 'PROVIDER_FORMAT' }); expect(r.rawText).toContain('sandbox');
});
it.each(['tool_calls', 'length', 'content_filter', 'unexpected'])('refuses unexpected finish reason %s even with empty tools', async finish_reason => {
  const r = await new LMStudioAdapter('mock-local', { fetchImpl: transport(async () => Response.json({ choices: [{ finish_reason, message: { content: JSON.stringify(good()), tool_calls: [] } }] })) }).extract('check sandbox');
  expect(r.error?.code).toBe('PROVIDER_FORMAT'); expect(r.proposal).toBeNull(); expect(r.diagnostics?.finishReason).toBe(finish_reason);
});
it('preserves bounded redacted failure content without producing cards', async () => {
  const content = JSON.stringify({ password: 'super-private-password', nested: { api_key: 'super-private-key' }, detail: 'Bearer abcdef-secret-123 sk-private-key-123456', padding: 'x'.repeat(5000) });
  const r = await new LMStudioAdapter('mock-local', { fetchImpl: transport(async () => Response.json({ choices: [{ finish_reason: 'length', message: { content, tool_calls: [] } }] })) }).extract('check sandbox', { caseId: 'case-1' });
  expect(r.proposal).toBeNull(); expect(r.diagnostics?.stage).toBe('provider_envelope'); expect(r.rawText!.length).toBeLessThanOrEqual(2060); expect(r.rawText).not.toMatch(/super-private|abcdef-secret|sk-private/); expect(r.rawText).toContain('REDACTED');
});
it('marks JSON/schema/HTTP/timeout failure stages with no accepted proposals', async () => {
  for (const [response, code, stage, status] of [
    [() => Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'broken' } }] }), 'INVALID_JSON', 'json_parse', 200],
    [() => Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{}' } }] }), 'SCHEMA_MISMATCH', 'schema_validation', 200],
    [() => new Response('Authorization: Bearer do-not-save', { status: 403 }), 'HTTP_ERROR', 'transport', 403],
  ] as const) {
    const r = await new LMStudioAdapter('mock-local', { fetchImpl: transport(async () => response()) }).extract('check sandbox');
    expect(r.error?.code).toBe(code); expect(r.diagnostics).toMatchObject({ stage, httpStatus: status, code }); expect(r.proposal).toBeNull(); expect(JSON.stringify(r)).not.toContain('do-not-save');
  }
});
