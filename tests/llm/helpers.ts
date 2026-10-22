import type { Proposal, ProposalCard } from '../../src/llm/types.js';
export const taskCard = (evidence = 'check sandbox'): Extract<ProposalCard, { type: 'task' }> => ({ intent: 'task', type: 'task', title: 'Check sandbox', fields: { action: 'check', target: 'sandbox' }, evidence });
export const good = (): Proposal => ({ cards: [taskCard()], constraints: [], unresolved: [] });
export function mockTransport(content: unknown = good(), chat?: (init?: RequestInit) => Promise<Response>): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    const path = String(url);
    if (path.endsWith('/api/version')) return Response.json({ version: 'mock-test-version' });
    if (path.endsWith('/api/tags')) return Response.json({ models: [{ name: 'test-local:tiny', size: 100, digest: 'mock-digest' }] });
    if (path.endsWith('/api/show')) return Response.json({ details: { family: 'mock' }, license: 'mock license fixture, not a real model' });
    if (chat) return chat(init);
    return Response.json({ done: true, message: { content: typeof content === 'string' ? content : JSON.stringify(content) } });
  }) as typeof fetch;
}
