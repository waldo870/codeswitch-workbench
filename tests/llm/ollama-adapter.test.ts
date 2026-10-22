import { describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { OllamaAdapter, localRequest, probeOllama, safeEndpoint, PARAMETERS } from '../../src/llm/ollama-adapter.js';
import { proposalSchema } from '../../src/llm/proposal-schema.js';
import { good, mockTransport } from './helpers.js';
describe('Ollama request and untrusted result handling (mock)', () => {
  it('uses structured schema, stream=false, local endpoint and no gold answers', async () => {
    const mock = vi.fn(mockTransport()); const result = await new OllamaAdapter('test-local:tiny', { fetchImpl: mock }).extract('check sandbox');
    expect(result.rawValidation).toBe('valid'); expect(result.identity.digest).toBe('mock-digest');
    const [url, init] = mock.mock.calls.find(c => String(c[0]).endsWith('/api/chat'))!;
    const body = JSON.parse(init!.body as string);
    expect(String(url)).toBe('http://127.0.0.1:11434/api/chat'); expect(init!.redirect).toBe('error');
    expect(body).toMatchObject({ model: 'test-local:tiny', stream: false, format: proposalSchema, options: PARAMETERS });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'check sandbox' }); expect(JSON.stringify(body)).not.toContain('expectedSlots');
    expect(init!.signal).toBeInstanceOf(AbortSignal); expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
  it('retains raw claims but never creates a confirmed work card', async () => {
    const proposal = good(); proposal.cards[0]!.status = 'confirmed'; proposal.cards[0]!.requiresConfirmation = false;
    const result = await new OllamaAdapter('test-local:tiny', { fetchImpl: mockTransport(proposal) }).extract('check sandbox');
    expect(result.proposal?.cards[0]!.status).toBe('confirmed'); // raw evidence of model behavior, not an authorized card
    expect(result.rawText).toContain('confirmed');
  });
  it.each(['not json', '```json\n{}\n```'])('rejects invalid model JSON: %s', async text => {
    const result = await new OllamaAdapter('test-local:tiny', { fetchImpl: mockTransport(text) }).extract('check sandbox');
    expect(result.error?.code).toBe('INVALID_JSON'); expect(result.proposal).toBeNull(); expect(result.rawText).toBe(text);
  });
  it.each([{}, { ...good(), extra: true }, { cards: [{ type: 'send' }], constraints: [], unresolved: [] }])('rejects schema mismatch', async value => {
    const result = await new OllamaAdapter('test-local:tiny', { fetchImpl: mockTransport(value) }).extract('check sandbox');
    expect(result.error?.code).toBe('SCHEMA_MISMATCH'); expect(result.proposal).toBeNull();
  });
  it('reports malformed provider envelope distinctly', async () => {
    const result = await new OllamaAdapter('test-local:tiny', { fetchImpl: mockTransport(null, async () => Response.json({ done: false, message: { content: '{}' } })) }).extract('check sandbox');
    expect(result.error?.code).toBe('PROVIDER_FORMAT');
  });
  it('enforces response size while reading chunks even without Content-Length', async () => {
    const fetchImpl = mockTransport(null, async () => new Response('x'.repeat(2000)));
    const result = await new OllamaAdapter('test-local:tiny', { fetchImpl, maxResponseBytes: 1000 }).extract('check sandbox');
    expect(result.error?.code).toBe('RESPONSE_TOO_LARGE');
  });
  it('rejects excessive Content-Length without consuming response', async () => {
    await expect(localRequest('/api/version', undefined, { maxResponseBytes: 5, fetchImpl: async () => new Response('{}', { headers: { 'Content-Length': '9000' } }) })).rejects.toMatchObject({ code: 'RESPONSE_TOO_LARGE' });
  });
  it('reports request timeout', async () => {
    const fetchImpl = mockTransport(null, init => new Promise((_, reject) => init!.signal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true })));
    const result = await new OllamaAdapter('test-local:tiny', { fetchImpl, timeoutMs: 15 }).extract('check sandbox');
    expect(result.error?.code).toBe('TIMEOUT'); expect(result.proposal).toBeNull();
  });
  it('reports connection refusal without treating absence as PASS', async () => {
    const probe = await probeOllama({ fetchImpl: async () => { throw new TypeError('ECONNREFUSED'); } });
    expect(probe).toMatchObject({ status: 'NOT_RUN', models: [] }); expect(probe.reason).toContain('connection failed');
  });
  it('reports HTTP and outer JSON errors', async () => {
    await expect(localRequest('/api/version', undefined, { fetchImpl: async () => new Response('', { status: 503 }) })).rejects.toMatchObject({ code: 'HTTP_ERROR' });
    await expect(localRequest('/api/version', undefined, { fetchImpl: async () => new Response('oops') })).rejects.toMatchObject({ code: 'INVALID_JSON' });
  });
  it('reports no installed models and refuses remote/cloud models', async () => {
    const probe = await probeOllama({ fetchImpl: (async url => String(url).endsWith('/api/version') ? Response.json({ version: 'test' }) : Response.json({ models: [{ name: 'x:cloud', digest: 'x', size: 1 }] })) as typeof fetch });
    expect(probe.status).toBe('NOT_RUN'); expect(probe.models).toEqual([]);
    expect(() => new OllamaAdapter('x:cloud')).toThrow();
    const base = mockTransport();
    const adapter = new OllamaAdapter('test-local:tiny', { fetchImpl: (async (url, init) => String(url).endsWith('/api/show') ? Response.json({ remote_host: 'remote', details: {} }) : base(url, init)) as typeof fetch });
    expect((await adapter.extract('check sandbox')).error?.code).toBe('MODEL_UNAVAILABLE');
  });
  it.each(['', ' '.repeat(3), 'x'.repeat(10001)])('rejects input bounds before network access', async input => {
    const mock = vi.fn(mockTransport()); const result = await new OllamaAdapter('test-local:tiny', { fetchImpl: mock }).extract(input);
    expect(result.error?.code).toBe('INVALID_INPUT'); expect(mock).not.toHaveBeenCalled();
  });
  it.each(['https://127.0.0.1:11434', 'http://localhost:11434', 'http://example.com', 'http://127.0.0.1@evil.test', 'http://127.0.0.1/api/chat', 'http://127.0.0.1?url=evil', 'http://0.0.0.0:11434'])('rejects untrusted endpoint %s', endpoint => expect(() => safeEndpoint(endpoint)).toThrow());
  it('allows only loopback literals and rejects arbitrary API operations', async () => {
    expect(safeEndpoint('http://[::1]:11434')).toBe('http://[::1]:11434');
    await expect(localRequest('/api/pull', {}, {})).rejects.toThrow('Unsupported');
  });
});
it('real Node HTTP transport handles loopback requests, redirects and aborts (not model inference)', async () => {
  const server = createServer((req, res) => {
    if (req.url === '/api/version') { res.writeHead(302, { Location: 'http://example.test/' }); res.end(); }
    else if (req.url === '/api/tags') { res.setHeader('Content-Type', 'application/json'); res.end('{"models":[]}'); }
    else { /* intentionally hold request open for timeout test */ }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('Missing address');
  const options = { endpoint: `http://127.0.0.1:${address.port}`, timeoutMs: 100 };
  try {
    expect(await localRequest('/api/tags', undefined, options)).toEqual({ models: [] });
    await expect(localRequest('/api/version', undefined, options)).rejects.toMatchObject({ code: 'NETWORK' });
    await expect(localRequest('/api/chat', {}, options)).rejects.toMatchObject({ code: 'TIMEOUT' });
  } finally { server.closeAllConnections(); server.close(); await once(server, 'close'); }
});

it('honors caller cancellation and preserves fail-closed proposal state', async () => {
  const controller = new AbortController(); controller.abort();
  const result = await new OllamaAdapter('test-local:tiny', { fetchImpl: mockTransport(null, async init => { init!.signal!.throwIfAborted(); return Response.json({}); }) }).extract('check sandbox', { signal: controller.signal });
  expect(result.error?.code).toBe('TIMEOUT'); expect(result.proposal).toBeNull();
});
