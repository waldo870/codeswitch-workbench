// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EXAMPLE, createWorkspace } from '../../../src/web/state/workspace.js';
import type { WorkspaceRecord, WorkspaceRepository } from '../../../src/web/storage/workspace-db.js';

const memory = vi.hoisted(() => new Map<string, unknown>());
vi.mock('../../../src/web/storage/extension-store.js', () => ({
  IndexedDbWorkspaceExtensionStore: class {
    async get(_namespace: string, id: string) { return memory.get(id) ?? null; }
    async put(_namespace: string, id: string, value: unknown) { memory.set(id, structuredClone(value)); }
  },
}));
import { P6TranslationPanel } from '../../../src/web/components/P6TranslationPanel.js';

const workspace = createWorkspace(EXAMPLE);
const record = { id: '12345678-1234-4234-8234-123456789abc', schemaVersion: 2, workspace, constraints: workspace.parsed.constraints } as WorkspaceRecord;
const props = { record, repository: {} as WorkspaceRepository };
afterEach(() => { cleanup(); memory.clear(); });

it('labels the feature as mock-only, keeps original evidence/constraints visible, and does not expose confirmation controls', () => {
  render(<P6TranslationPanel {...props} />);
  expect(screen.getByText(/Deterministic mock only/)).toBeVisible();
  expect(screen.getByText(/not included in workspace or encrypted exchange exports/)).toBeVisible();
  expect(screen.getByLabelText('Original constraints (translation review)')).toHaveTextContent('1 original constraint(s) remain unchanged');
  expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
});

it('renders the mock result separately while leaving the source card draft and evidence intact', async () => {
  const before = structuredClone(workspace);
  render(<P6TranslationPanel {...props} />);
  const card = screen.getByRole('group', { name: 'calendar translation' });
  fireEvent.click(within(card).getByRole('button', { name: 'Create mock translation' }));
  expect(await screen.findByText('檢視 payment webhook')).toBeVisible();
  expect(card).toHaveTextContent(workspace.cards[0]!.current.evidence.text);
  expect(card).toHaveTextContent('Human review required');
  expect(workspace).toEqual(before);
  expect(workspace.cards[0]!.current.status).toBe('draft');
});

it('falls back to original card text for unsupported phrases and storage stays separate', async () => {
  const changed = { ...record, workspace: { ...workspace, cards: workspace.cards.map((card, index) => index === 0 ? { ...card, current: { ...card.current, title: 'Unsupported phrase' } } : card) } } as WorkspaceRecord;
  render(<P6TranslationPanel {...props} record={changed} />);
  const card = screen.getByRole('group', { name: 'calendar translation' });
  fireEvent.click(within(card).getByRole('button', { name: 'Create mock translation' }));
  expect(await screen.findByText(/No exact mock phrase is available/)).toBeVisible();
  expect(card).toHaveTextContent('Fallback (original text): Unsupported phrase');
  expect(memory.size).toBe(0);
});
