import type { FailureCode } from './types.js';
export class ProviderError extends Error { constructor(public code: FailureCode, message: string) { super(message); } }
export interface TransportOptions { endpoint?: string; fetchImpl?: typeof fetch; timeoutMs?: number; maxResponseBytes?: number }
export function loopbackEndpoint(value: string, allowLocalhost = false): string {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]', ...(allowLocalhost ? ['localhost'] : [])].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Only loopback HTTP endpoints are allowed.');
  if (url.hostname === 'localhost') url.hostname = '127.0.0.1';
  return url.origin;
}
export async function boundedJsonRequest(endpoint: string, path: string, body: unknown, options: TransportOptions, signal?: AbortSignal, label = 'provider'): Promise<unknown> {
  const timeout = options.timeoutMs ?? 60000;
  const limit = options.maxResponseBytes ?? 262144;
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 300000 || !Number.isInteger(limit) || limit < 1 || limit > 1048576) throw new Error('Invalid resource limits.');
  const deadline = AbortSignal.timeout(timeout);
  const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
  try {
    const response = await (options.fetchImpl ?? fetch)(endpoint + path, { method: body === undefined ? 'GET' : 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: combined });
    if (!response.ok) { await response.body?.cancel(); throw new ProviderError('HTTP_ERROR', `${label} HTTP ${response.status}`); }
    if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new ProviderError('RESPONSE_TOO_LARGE', 'Response exceeds byte limit.'); }
    if (!response.body) throw new ProviderError('PROVIDER_FORMAT', 'Missing response body.');
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > limit) { await reader.cancel(); throw new ProviderError('RESPONSE_TOO_LARGE', 'Response exceeds byte limit.'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ProviderError('INVALID_JSON', 'Provider envelope is not valid JSON.'); }
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (combined.aborted) throw new ProviderError('TIMEOUT', 'Request timed out or was aborted.');
    throw new ProviderError('NETWORK', `Local ${label} connection failed.`);
  }
}
