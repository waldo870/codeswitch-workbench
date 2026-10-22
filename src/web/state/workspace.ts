import { extract } from '../../engine/extract.js';
import { validate } from '../../engine/validate.js';
import type { Extraction, WorkCard } from '../../contracts/work-card.js';

export const MAX_INPUT = 10000;
export const EXAMPLE = "明天早上九點 review payment webhook，先 check sandbox credentials, but don't deploy to production yet. 然後 draft an English follow-up email to Vincent。";
export const TARGETS = ['payment webhook', 'sandbox credentials', 'sandbox', 'production settings', 'deployment plan', '報告', '測試設定', 'production', 'staging'] as const;
export type EditableCard = Exclude<WorkCard, { type: 'email_draft' }> | (Omit<Extract<WorkCard, { type: 'email_draft' }>, 'fields'> & { fields: { action: 'draft'; recipientName: string | null; recipientEmail: string | null; language: string | null; body: string | null } });
export type EditKey = 'title' | 'action' | 'target' | 'time' | 'recipientName' | 'recipientEmail' | 'language' | 'body';
export type CardEvent = { kind: 'edit'; field: EditKey; before: string | null; after: string | null } | { kind: 'confirm'; revision: number } | { kind: 'reject' };
export interface CardState { id: string; current: EditableCard; history: CardEvent[]; revision: number; confirmedRevision: number | null }
export interface Workspace { schemaVersion: 1; originalInput: string; parsed: Extraction; cards: CardState[] }
export interface ExportDocument { schemaVersion: 1; kind: 'confirmed-workcards'; originalInput: string; constraints: Extraction['constraints']; cards: CardState[]; executed: false }
const clone = <T,>(value: T): T => structuredClone(value);
export const same = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const x = a as Record<string, unknown>, y = b as Record<string, unknown>;
  return Object.keys(x).length === Object.keys(y).length && Object.keys(x).every(k => Object.hasOwn(y, k) && same(x[k], y[k]));
};
export function createWorkspace(input: string): Workspace {
  if (!input.trim() || input.length > MAX_INPUT) throw new Error(`Enter 1–${MAX_INPUT} characters.`);
  const parsed = extract(input);
  return { schemaVersion: 1, originalInput: input, parsed, cards: parsed.cards.map(card => ({ id: card.id, current: clone(card), history: [], revision: 0, confirmedRevision: null })) };
}
export function editableKeys(card: EditableCard): EditKey[] {
  return card.type === 'email_draft' ? ['title', 'recipientName', 'recipientEmail', 'language', 'body'] : card.type === 'calendar' ? ['title', 'action', 'target', 'time'] : ['title', 'action', 'target'];
}
export function fieldValue(card: EditableCard, key: EditKey): string | null {
  return key === 'title' ? card.title : (card.fields as unknown as Record<string, string | null>)[key] ?? null;
}
export function suggestedTitle(card: EditableCard): string {
  if (card.type === 'email_draft') return `Prepare ${card.fields.language ? card.fields.language + ' ' : ''}email${card.fields.recipientName ? ' to ' + card.fields.recipientName : ''}`;
  return `${card.fields.action.charAt(0).toUpperCase()}${card.fields.action.slice(1)} ${card.fields.target}`;
}
const norm = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
function validTime(value: string | null): boolean {
  if (value === 'Tomorrow, 9:00 AM') return true;
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const d = new Date(value + ':00Z');
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 16) === value;
}
// Independent of text interpretation: closed normalized operations plus title/field agreement.
export function safetyErrors(workspace: Workspace, card: EditableCard): string[] {
  const errors: string[] = [];
  const sourceReport = validate(workspace.originalInput, workspace.parsed);
  if (!sourceReport.valid) errors.push('Original extraction failed P0 validation. Revise the input and analyze again.');
  if (workspace.parsed.unresolved.length) errors.push('Unresolved source text blocks confirmation and export. Clarify the input first.');
  if (workspace.parsed.constraints.some(c => c.polarity === 'required')) errors.push('Required constraints need a future verification workflow; confirmation is blocked.');
  if (!card.title.trim()) errors.push('Title is required.');
  if (card.type === 'email_draft') {
    const f = card.fields;
    if (!f.recipientName?.trim()) errors.push('Recipient name is required.');
    if (!f.recipientEmail || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(f.recipientEmail)) errors.push('Recipient email is unknown or invalid.');
    if (!['English', 'Chinese'].includes(f.language ?? '')) errors.push('Choose English or Chinese.');
    if (!f.body?.trim()) errors.push('Email body is required; enter your own draft.');
    const expected = norm(suggestedTitle(card));
    if (![expected, expected.replace('email', 'follow-up email')].includes(norm(card.title))) errors.push('Title must describe this draft and match recipient/language fields.');
  } else {
    const action = norm(card.fields.action), target = norm(card.fields.target);
    if (!['check', 'review', 'deploy'].includes(action) || !TARGETS.some(t => t === target) || (action === 'deploy' ? !['production', 'staging'].includes(target) : ['production', 'staging'].includes(target))) errors.push('Unsupported action/target combination.');
    const title = norm(card.title).replace(/^(check|review|deploy) to /, '$1 ');
    if (title !== `${action} ${target}`) errors.push('Title must match the normalized action and target; unknown instructions cannot be confirmed.');
    // Check title independently: changing only the visible title cannot conceal a prohibition.
    const titleOperation = norm(card.title).match(/^(deploy|部署)\s*(?:to\s*|到)?(production|正式環境)$/);
    for (const c of workspace.parsed.constraints) {
      if (c.polarity !== 'prohibited') continue;
      if ((c.action === action && (c.scope === '*' || norm(c.scope) === target)) || (titleOperation && c.action === 'deploy' && ['*', 'production'].includes(c.scope))) errors.push(`Prohibited action: ${c.action} / ${c.scope}. Confirmation is blocked.`);
    }
    if (card.type === 'calendar' && !validTime(card.fields.time)) errors.push('Time is missing or incomplete. Use YYYY-MM-DDTHH:mm, or retain the supported relative time.');
  }
  return errors;
}
function applyEvent(workspace: Workspace, state: CardState, event: CardEvent): CardState {
  if (state.history.length >= 2000) throw new Error('Review history limit reached. Export confirmed work or start a new analysis.');
  const next = clone(state);
  if (event.kind === 'edit') {
    if (!editableKeys(next.current).includes(event.field) || fieldValue(next.current, event.field) !== event.before || !(event.after === null || typeof event.after === 'string') || (event.after?.length ?? 0) > 5000) throw new Error('Invalid edit history.');
    if (['title', 'action', 'target'].includes(event.field) && event.after === null) throw new Error('This field must be a string.');
    if (event.field === 'title') next.current.title = event.after!;
    else (next.current.fields as unknown as Record<string, string | null>)[event.field] = event.after;
    next.current.status = 'draft'; next.current.requiresConfirmation = true;
    next.revision++; next.confirmedRevision = null;
  } else if (event.kind === 'confirm') {
    if (next.current.status !== 'draft' || event.revision !== next.revision) throw new Error('Confirmation is stale or invalid.');
    const errors = safetyErrors(workspace, next.current);
    if (errors.length) throw new Error(errors.join(' '));
    next.current.status = 'confirmed'; next.current.requiresConfirmation = false; next.confirmedRevision = next.revision;
  } else if (event.kind === 'reject') {
    next.current.status = 'rejected'; next.current.requiresConfirmation = true; next.confirmedRevision = null;
  } else throw new Error('Unknown history event.');
  next.history.push(clone(event));
  return next;
}
// Strict reconstruction rejects extra keys, malformed cards, changed evidence and stale confirmation.
export function restoreWorkspace(value: unknown): Workspace {
  if (!value || typeof value !== 'object') throw new Error('Invalid workspace.');
  const raw = value as Workspace;
  if (raw.schemaVersion !== 1 || typeof raw.originalInput !== 'string' || !Array.isArray(raw.cards)) throw new Error('Unsupported workspace schema.');
  const rebuilt = createWorkspace(raw.originalInput);
  if (!same(raw.parsed, rebuilt.parsed) || raw.cards.length !== rebuilt.cards.length) throw new Error('Original extraction or evidence was changed.');
  rebuilt.cards = rebuilt.cards.map((initial, index) => {
    const saved = raw.cards[index];
    if (!saved || !Array.isArray(saved.history) || saved.history.length > 2000) throw new Error('Invalid card history.');
    let state = initial;
    for (const event of saved.history) {
      if (!event || typeof event !== 'object') throw new Error('Invalid history event.');
      const keys = event.kind === 'edit' ? ['kind', 'field', 'before', 'after'] : event.kind === 'confirm' ? ['kind', 'revision'] : ['kind'];
      if (Object.keys(event).length !== keys.length || !keys.every(k => Object.hasOwn(event, k))) throw new Error('Invalid event schema.');
      state = applyEvent(rebuilt, state, event);
    }
    if (!same(saved, state)) throw new Error('Card content or confirmation does not match history.');
    return state;
  });
  if (!same(raw, rebuilt)) throw new Error('Invalid workspace fields.');
  return rebuilt;
}
export function editCard(workspace: Workspace, id: string, field: EditKey, after: string | null): Workspace {
  const valid = restoreWorkspace(workspace);
  const state = valid.cards.find(c => c.id === id);
  if (!state) throw new Error('Card not found.');
  const last = state.history.at(-1);
  // One continuous field edit is one audit entry; typing does not exhaust history.
  // A confirmation/rejection or another field always starts a new entry.
  if (last?.kind === 'edit' && last.field === field) {
    last.after = after;
    if (field === 'title') state.current.title = after!;
    else (state.current.fields as unknown as Record<string, string | null>)[field] = after;
    return restoreWorkspace(valid);
  }
  return transition(valid, id, { kind: 'edit', field, before: fieldValue(state.current, field), after });
}
function transition(workspace: Workspace, id: string, event: CardEvent): Workspace {
  const valid = restoreWorkspace(workspace);
  if (!valid.cards.some(c => c.id === id)) throw new Error('Card not found.');
  valid.cards = valid.cards.map(c => c.id === id ? applyEvent(valid, c, event) : c);
  return valid;
}
export function confirmCard(workspace: Workspace, id: string): Workspace {
  const state = workspace.cards.find(c => c.id === id);
  if (!state) throw new Error('Card not found.');
  return transition(workspace, id, { kind: 'confirm', revision: state.revision });
}
export const rejectCard = (workspace: Workspace, id: string): Workspace => transition(workspace, id, { kind: 'reject' });
export function exportWorkspace(value: unknown): ExportDocument {
  const workspace = restoreWorkspace(value);
  const cards = workspace.cards.filter(c => c.current.status === 'confirmed');
  if (!cards.length) throw new Error('Confirm at least one card before exporting.');
  for (const card of cards) {
    const errors = safetyErrors(workspace, card.current);
    if (errors.length || card.confirmedRevision !== card.revision) throw new Error(errors.join(' ') || 'Stale confirmation.');
  }
  return { schemaVersion: 1, kind: 'confirmed-workcards', originalInput: workspace.originalInput, constraints: clone(workspace.parsed.constraints), cards: clone(cards), executed: false };
}
export function validateExport(value: unknown): boolean {
  try {
    const raw = value as ExportDocument;
    if (!raw || !Array.isArray(raw.cards) || !raw.cards.length) return false;
    const workspace = createWorkspace(raw.originalInput);
    if (new Set(raw.cards.map(c => c.id)).size !== raw.cards.length || raw.cards.some(c => !workspace.cards.some(s => s.id === c.id))) return false;
    workspace.cards = workspace.cards.map(c => raw.cards.find(s => s.id === c.id) ?? c);
    return same(raw, exportWorkspace(workspace));
  } catch { return false; }
}
