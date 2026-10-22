import { restoreWorkspace, type Workspace } from '../state/workspace.js';
export const STORAGE_KEY = 'codeswitch-workbench.workspace.v1';
export const MAX_STORAGE_BYTES = 2_000_000;
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export function loadWorkspace(storage: StoragePort): { workspace: Workspace | null; error: string | null } {
  try {
    const text = storage.getItem(STORAGE_KEY);
    if (text === null) return { workspace: null, error: null };
    if (text.length > MAX_STORAGE_BYTES) throw new Error('Stored workspace is too large.');
    return { workspace: restoreWorkspace(JSON.parse(text)), error: null };
  } catch { return { workspace: null, error: 'Local data could not be restored. It was not overwritten. Clear Local Data to start fresh.' }; }
}
export function saveWorkspace(storage: StoragePort, workspace: Workspace): void {
  const serialized = JSON.stringify(restoreWorkspace(workspace));
  if (serialized.length > MAX_STORAGE_BYTES) throw new Error('Workspace is too large for local storage.');
  storage.setItem(STORAGE_KEY, serialized);
}
