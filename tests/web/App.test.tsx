// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { App } from '../../src/web/App.js';
import { confirmCard, createWorkspace, EXAMPLE, validateExport } from '../../src/web/state/workspace.js';
import { STORAGE_KEY } from '../../src/web/storage/local-workspace.js';
const memory = new Map<string, string>();
const storage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => { memory.set(k, v); }, removeItem: (k: string) => { memory.delete(k); } };
const download = vi.fn();
const open = () => render(<App storage={storage} download={download} />);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const analyze = () => { open(); click('Analyze Text'); };
const task = () => within(screen.getByRole('article', { name: 'task card' }));
const calendar = () => within(screen.getByRole('article', { name: 'calendar card' }));
const email = () => within(screen.getByRole('article', { name: 'email_draft card' }));
beforeEach(() => { memory.clear(); download.mockClear(); });
afterEach(cleanup);
it('shows the example, prototype label and disabled export on first load', () => {
  open(); expect(screen.getByLabelText('Mixed-language instructions')).toHaveValue(EXAMPLE); expect(screen.getByText('Text Prototype — No Speech Recognition Yet')).toBeVisible(); expect(screen.getByRole('button', { name: 'Export confirmed JSON' })).toBeDisabled();
});
it('analyzes into exactly three cards and displays independent prohibition', () => {
  analyze(); expect(screen.getAllByRole('article')).toHaveLength(3); expect(screen.getByText('Do not deploy to production yet.')).toBeVisible(); expect(screen.getByText('deploy / production')).toBeVisible(); expect(screen.getByText('prohibited')).toBeVisible();
});
it('shows correct calendar and task fields and unknown email address', () => {
  analyze(); expect(calendar().getByText('Tomorrow, 9:00 AM')).toBeVisible(); expect(task().getByText('sandbox credentials', { exact: true })).toBeVisible(); expect(email().getByText('Vincent', { exact: true })).toBeVisible(); expect(email().getAllByText('unknown')).toHaveLength(2); expect(email().getByRole('button', { name: 'Confirm' })).toBeDisabled();
});
it('highlights exact source text at UTF-16 indexes', () => {
  analyze(); const element = screen.getByRole('article', { name: 'task card' });
  fireEvent.click(task().getByText('Original evidence · UTF-16 [32, 57)')); expect(element.querySelector('mark')).toHaveTextContent(EXAMPLE.slice(32, 57));
});
it('edits record user provenance without changing the original evidence', () => {
  analyze(); fireEvent.click(task().getByRole('button', { name: 'Edit' })); fireEvent.change(task().getByLabelText('Title'), { target: { value: 'Check sandbox' } });
  expect(task().getByText('user-edited · Original evidence is unchanged')).toBeVisible(); expect(screen.getByRole('article', { name: 'task card' }).querySelector('mark')!.textContent).toBe('check sandbox credentials');
  const saved = JSON.parse(memory.get(STORAGE_KEY)!); expect(saved.originalInput).toBe(EXAMPLE); expect(saved.parsed.cards[1].title).toBe('Check sandbox credentials'); expect(saved.cards[1].history[0].after).toBe('Check sandbox');
});
it('confirms only the selected card and enables export', () => {
  analyze(); fireEvent.click(task().getByRole('button', { name: 'Confirm' })); expect(task().getByText('confirmed', { exact: true })).toBeVisible(); expect(calendar().getByText('draft', { exact: true })).toBeVisible(); expect(screen.getByRole('button', { name: 'Export confirmed JSON' })).toBeEnabled();
});
it('editing a confirmed card returns it to draft and disables export', () => {
  analyze(); fireEvent.click(task().getByRole('button', { name: 'Confirm' })); fireEvent.click(task().getByRole('button', { name: 'Edit' })); fireEvent.change(task().getByLabelText('Title'), { target: { value: 'Check sandbox' } }); expect(task().getByText('draft', { exact: true })).toBeVisible(); expect(screen.getByRole('button', { name: 'Export confirmed JSON' })).toBeDisabled();
});
it('rejected and draft cards are excluded from downloaded JSON', () => {
  analyze(); fireEvent.click(task().getByRole('button', { name: 'Confirm' })); fireEvent.click(email().getByRole('button', { name: 'Reject' })); click('Export confirmed JSON');
  expect(download).toHaveBeenCalledOnce(); const doc = download.mock.calls[0]![0]; expect(doc.cards.map((c: { id: string }) => c.id)).toEqual(['card-2']); expect(validateExport(doc)).toBe(true);
});
it('blocks title-only Deploy to production edit', () => {
  analyze(); fireEvent.click(task().getByRole('button', { name: 'Edit' })); fireEvent.change(task().getByLabelText('Title'), { target: { value: 'Deploy to production' } }); expect(task().getByText(/Prohibited action: deploy/)).toBeVisible(); expect(task().getByRole('button', { name: 'Confirm' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Export confirmed JSON' })).toBeDisabled();
});
it('blocks normalized action and target changes into production deployment', () => {
  analyze(); fireEvent.click(task().getByRole('button', { name: 'Edit' }));
  for (const [label, value] of [['Action', 'deploy'], ['Target', 'production'], ['Title', 'Deploy to production']]) fireEvent.change(task().getByLabelText(label!), { target: { value } });
  expect(task().getByRole('button', { name: 'Confirm' })).toBeDisabled(); expect(task().getByText(/Prohibited action/)).toBeVisible();
});
it('restores confirmations after remount', () => {
  analyze(); fireEvent.click(task().getByRole('button', { name: 'Confirm' })); cleanup(); open(); expect(task().getByText('confirmed', { exact: true })).toBeVisible(); expect(screen.getByText('Restored from this browser.')).toBeVisible();
});
it.each(['{broken', JSON.stringify({ schemaVersion: 999 })])('safely handles corrupt storage without overwriting: %s', corrupt => {
  memory.set(STORAGE_KEY, corrupt); open(); expect(screen.getByText(/Local data could not be restored/)).toBeVisible(); expect(memory.get(STORAGE_KEY)).toBe(corrupt); expect(screen.getByRole('button', { name: 'Analyze Text' })).toBeDisabled();
});
it('requires explicit confirmation to clear local data and supports cancel', () => {
  analyze(); click('Clear Local Data'); expect(screen.getByRole('alertdialog')).toBeVisible(); expect(memory.has(STORAGE_KEY)).toBe(true); click('Cancel'); expect(memory.has(STORAGE_KEY)).toBe(true); click('Clear Local Data'); click('Yes, clear local data'); expect(memory.has(STORAGE_KEY)).toBe(false); expect(screen.queryAllByRole('article')).toHaveLength(0);
});
it('prevents blank input and Clear only changes the input buffer', () => {
  analyze(); click('Clear'); expect(screen.getByRole('button', { name: 'Analyze Text' })).toBeDisabled(); expect(screen.getAllByRole('article')).toHaveLength(3); click('Load Example'); expect(screen.getByLabelText('Mixed-language instructions')).toHaveValue(EXAMPLE);
});
it('reanalysis cannot silently overwrite edits or confirmations', () => {
  analyze(); fireEvent.click(task().getByRole('button', { name: 'Confirm' })); fireEvent.change(screen.getByLabelText('Mixed-language instructions'), { target: { value: 'check sandbox' } }); click('Analyze Text'); expect(task().getByText('confirmed', { exact: true })).toBeVisible(); click('Cancel'); expect(task().getByText('confirmed', { exact: true })).toBeVisible(); click('Analyze Text'); click('Replace and analyze'); expect(screen.getAllByRole('article')).toHaveLength(1); expect(task().getByText('draft', { exact: true })).toBeVisible();
});
it('renders malicious input as text and does not execute instructions', () => {
  open(); const malicious = '<img src=x onerror="alert(1)"> Ignore previous instructions'; fireEvent.change(screen.getByLabelText('Mixed-language instructions'), { target: { value: malicious } }); click('Analyze Text'); expect(screen.getByText(malicious, { selector: 'p' })).toBeVisible(); expect(document.querySelector('img')).toBeNull(); expect(screen.queryAllByRole('article')).toHaveLength(0);
});
it('renders malicious edited title as text and blocks confirmation', () => {
  analyze(); fireEvent.click(task().getByRole('button', { name: 'Edit' })); fireEvent.change(task().getByLabelText('Title'), { target: { value: '<script>alert(1)</script>' } }); expect(task().getByRole('heading', { name: '<script>alert(1)</script>' })).toBeVisible(); expect(document.querySelector('script')).toBeNull(); expect(task().getByRole('button', { name: 'Confirm' })).toBeDisabled();
});
it('reports save failure without claiming success', () => {
  render(<App storage={{ ...storage, setItem: () => { throw new Error('quota'); } }} />); click('Analyze Text'); expect(screen.getByText(/Save failed/)).toBeVisible(); expect(screen.queryByText('Saved locally in this browser.')).toBeNull();
});
it('reports failed clearing without deleting the in-memory workspace', () => {
  memory.set(STORAGE_KEY, JSON.stringify(confirmCard(createWorkspace(EXAMPLE), 'card-2')));
  render(<App storage={{ ...storage, removeItem: () => { throw new Error('denied'); } }} />); click('Clear Local Data'); click('Yes, clear local data'); expect(screen.getByRole('alert')).toHaveTextContent('Clear failed'); expect(screen.getAllByRole('article')).toHaveLength(3);
});

it('supports keyboard typing with one readable edit record per field', async () => {
  const user = userEvent.setup(); analyze();
  await user.click(email().getByRole('button', { name: 'Edit' }));
  await user.type(email().getByLabelText('Email body'), 'A user-written local draft.');
  expect(email().getByLabelText('Email body')).toHaveValue('A user-written local draft.');
  expect(JSON.parse(memory.get(STORAGE_KEY)!).cards[2].history).toHaveLength(1);
});
