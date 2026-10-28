import type { SpeechSession } from '../../contracts/speech.js';
import { restoreSpeech } from '../../speech/session.js';
import { editCard, rejectCard, restoreWorkspace, type Workspace } from '../state/workspace.js';
import { SPEECH_STORAGE_KEY } from './local-speech.js';
import { STORAGE_KEY, type StoragePort } from './local-workspace.js';

export const WORKSPACE_DB_NAME = 'codeswitch-workbench';
export const WORKSPACE_DB_VERSION = 1;
export const WORKSPACE_EXPORT_FORMAT = 'codeswitch-workspace';
export const ACTIVE_WORKSPACE_SETTING = 'codeswitch-workbench.active-workspace';
export const LEGACY_MIGRATION_SETTING = 'codeswitch-workbench.localstorage-migration.v1';
const WORKSPACES = 'workspaces';
const META = 'meta';
const MAX_BUNDLE_BYTES = 4_000_000;

export interface ExportMetadata { kind: 'workspace-json' | 'confirmed-workcards-json'; exportedAt: string; cardIds: string[] }
export interface WorkspaceRecord {
  id: string;
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
  workspace: Workspace;
  audioMetadata: null | { sha256: string; name: string; bytes: number; durationSeconds: number; format: 'wav'; sampleRateHz: 16000; channels: 1; bitsPerSample: 16 };
  asrMetadata: null | { providerId: string; modelId: string; runtime: NonNullable<SpeechSession['recognition']['runtime']> | null; executionMode: 'live' | 'mock' | 'unknown' };
  rawTranscript: string | null;
  transcriptCorrections: SpeechSession['edits'];
  constraints: Workspace['parsed']['constraints'];
  exportMetadata: ExportMetadata[];
}
export interface WorkspaceBundle { format: typeof WORKSPACE_EXPORT_FORMAT; schemaVersion: 1; workspaceId: string; createdAt: string; updatedAt: string; workspace: Workspace; exportMetadata: ExportMetadata[] }
export interface WorkspaceListResult { records: WorkspaceRecord[]; errors: string[] }
export interface WorkspaceRepository {
  list(): Promise<WorkspaceListResult>;
  get(id: string): Promise<WorkspaceRecord | null>;
  save(workspace: Workspace, id?: string): Promise<WorkspaceRecord>;
  delete(id: string): Promise<void>;
  clearAll(): Promise<void>;
  loadSpeechDraft(): Promise<SpeechSession | null>;
  saveSpeechDraft(session: SpeechSession | null): Promise<void>;
  exportBundle(id: string): Promise<WorkspaceBundle>;
  importBundle(value: unknown): Promise<WorkspaceRecord>;
  markExported(id: string, kind: ExportMetadata['kind'], cardIds: string[]): Promise<WorkspaceRecord>;
  migrateLegacy(storage: StoragePort): Promise<{ migrated: WorkspaceRecord | null; speechDraft: SpeechSession | null; error: string | null }>;
}

const iso = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const ownKeys = (value: object, keys: string[]) => Object.keys(value).every(key => keys.includes(key)) && keys.every(key => Object.hasOwn(value, key));
const randomId = () => globalThis.crypto.randomUUID();

function buildRecord(id: string, workspaceValue: unknown, previous?: WorkspaceRecord): WorkspaceRecord {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid workspace ID.');
  const workspace = restoreWorkspace(workspaceValue);
  const session = workspace.speech?.session;
  const now = new Date().toISOString();
  return {
    id, schemaVersion: 1, createdAt: previous?.createdAt ?? now, updatedAt: now, workspace,
    audioMetadata: session ? { sha256: session.source.id, name: session.source.name, bytes: session.source.bytes, durationSeconds: session.source.duration, format: session.source.format, sampleRateHz: session.source.sampleRate, channels: session.source.channels, bitsPerSample: session.source.bitsPerSample } : null,
    asrMetadata: session ? { providerId: session.recognition.provider, modelId: session.recognition.modelId, runtime: session.recognition.runtime ?? null, executionMode: session.recognition.runtime?.mode ?? 'unknown' } : null,
    rawTranscript: session?.recognition.transcript ?? null,
    transcriptCorrections: session ? structuredClone(session.edits) : [],
    constraints: structuredClone(workspace.parsed.constraints),
    exportMetadata: previous ? structuredClone(previous.exportMetadata) : [],
  };
}

export function validateWorkspaceRecord(value: unknown): WorkspaceRecord {
  if (!value || typeof value !== 'object') throw new Error('Invalid workspace record.');
  const r = value as WorkspaceRecord;
  if (!ownKeys(r, ['id','schemaVersion','createdAt','updatedAt','workspace','audioMetadata','asrMetadata','rawTranscript','transcriptCorrections','constraints','exportMetadata']) || r.schemaVersion !== 1 || !iso(r.createdAt) || !iso(r.updatedAt) || !Array.isArray(r.exportMetadata) || r.exportMetadata.length > 1000) throw new Error('Unsupported workspace record schema.');
  const rebuilt = buildRecord(r.id, r.workspace, r);
  if (r.audioMetadata !== null && JSON.stringify(r.audioMetadata) !== JSON.stringify(rebuilt.audioMetadata) || r.asrMetadata !== null && JSON.stringify(r.asrMetadata) !== JSON.stringify(rebuilt.asrMetadata) || r.rawTranscript !== rebuilt.rawTranscript || JSON.stringify(r.transcriptCorrections) !== JSON.stringify(rebuilt.transcriptCorrections) || JSON.stringify(r.constraints) !== JSON.stringify(rebuilt.constraints) || !Array.isArray(r.transcriptCorrections) || !Array.isArray(r.constraints) || r.exportMetadata.some(item => !item || !ownKeys(item, ['kind','exportedAt','cardIds']) || !['workspace-json','confirmed-workcards-json'].includes(item.kind) || !iso(item.exportedAt) || !Array.isArray(item.cardIds) || item.cardIds.length > 1000 || item.cardIds.some(id => typeof id !== 'string'))) throw new Error('Workspace provenance or export metadata was changed.');
  return structuredClone(r);
}

export function invalidateImportedConfirmations(value: unknown): Workspace {
  const saved = restoreWorkspace(value);
  let result = restoreWorkspace({ schemaVersion: 1, originalInput: saved.originalInput, parsed: saved.parsed, cards: saved.cards.map(card => ({ id: card.id, current: saved.parsed.cards.find(parsed => parsed.id === card.id)!, history: [], revision: 0, confirmedRevision: null })), ...(saved.speech ? { speech: saved.speech } : {}) });
  for (const card of saved.cards) {
    for (const event of card.history) {
      if (event.kind === 'edit') result = editCard(result, card.id, event.field, event.after);
      else if (event.kind === 'reject') result = rejectCard(result, card.id);
      // Imported confirmation events are deliberately discarded. Confirmation must happen again here.
    }
  }
  return restoreWorkspace(result);
}

export function parseWorkspaceBundle(value: unknown): WorkspaceBundle {
  if (!value || typeof value !== 'object') throw new Error('Invalid workspace JSON.');
  const b = value as WorkspaceBundle;
  if (!ownKeys(b, ['format','schemaVersion','workspaceId','createdAt','updatedAt','workspace','exportMetadata']) || b.format !== WORKSPACE_EXPORT_FORMAT || b.schemaVersion !== 1 || !/^[0-9a-f-]{36}$/i.test(b.workspaceId) || !iso(b.createdAt) || !iso(b.updatedAt) || !Array.isArray(b.exportMetadata) || b.exportMetadata.length > 1000) throw new Error('Unsupported workspace JSON format or version.');
  const record = validateWorkspaceRecord({ ...buildRecord(b.workspaceId, b.workspace), createdAt: b.createdAt, updatedAt: b.updatedAt, exportMetadata: b.exportMetadata });
  return { format: WORKSPACE_EXPORT_FORMAT, schemaVersion: 1, workspaceId: record.id, createdAt: record.createdAt, updatedAt: record.updatedAt, workspace: record.workspace, exportMetadata: record.exportMetadata };
}

export class IndexedDbWorkspaceRepository implements WorkspaceRepository {
  private database: Promise<IDBDatabase> | null = null;
  private serial: Promise<unknown> = Promise.resolve();
  constructor(private readonly factory: IDBFactory | undefined = globalThis.indexedDB) {}

  private open(): Promise<IDBDatabase> {
    if (!this.factory) return Promise.reject(new Error('IndexedDB is unavailable in this browser.'));
    if (this.database) return this.database;
    this.database = new Promise((resolve, reject) => {
      const request = this.factory!.open(WORKSPACE_DB_NAME, WORKSPACE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(WORKSPACES)) db.createObjectStore(WORKSPACES, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' });
      };
      request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); this.database = null; }; resolve(db); };
      request.onerror = () => { this.database = null; reject(new Error('Local database could not be opened.'));
      };
      request.onblocked = () => { this.database = null; reject(new Error('Local database upgrade is blocked by another open tab. Close other CodeSwitch tabs and retry.')); };
    });
    return this.database;
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const next = this.serial.then(work, work);
    this.serial = next.catch(() => undefined);
    return next;
  }

  async list(): Promise<WorkspaceListResult> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(WORKSPACES, 'readonly');
      const request = tx.objectStore(WORKSPACES).getAll();
      request.onsuccess = () => {
        const records: WorkspaceRecord[] = [], errors: string[] = [];
        for (const item of request.result as unknown[]) { try { records.push(validateWorkspaceRecord(item)); } catch { errors.push('A stored session has invalid or unsupported data and was left untouched.'); } }
        records.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)); resolve({ records, errors });
      };
      request.onerror = () => reject(new Error('Saved sessions could not be listed.'));
      tx.onerror = () => reject(new Error('Saved sessions could not be listed.'));
    });
  }

  async get(id: string): Promise<WorkspaceRecord | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const db = await this.open();
    return new Promise((resolve,reject) => { const tx=db.transaction(WORKSPACES,'readonly'), request=tx.objectStore(WORKSPACES).get(id); request.onsuccess=()=>{try{resolve(request.result===undefined?null:validateWorkspaceRecord(request.result));}catch{reject(new Error('Saved session is corrupt or uses an unsupported version. It was not changed.'));}};request.onerror=()=>reject(new Error('Saved session could not be opened.')); });
  }

  save(workspaceValue: Workspace, id: string = randomId()): Promise<WorkspaceRecord> {
    return this.enqueue(async () => {
      const workspace=restoreWorkspace(workspaceValue), db=await this.open();
      return new Promise((resolve,reject)=>{const tx=db.transaction(WORKSPACES,'readwrite'),store=tx.objectStore(WORKSPACES),get=store.get(id);let record:WorkspaceRecord;get.onsuccess=()=>{try{const previous=get.result===undefined?undefined:validateWorkspaceRecord(get.result);record=buildRecord(id,workspace,previous);store.put(record);}catch(e){tx.abort();reject(e);}};get.onerror=()=>{tx.abort();reject(new Error('Saved session could not be read before update.'));};tx.oncomplete=()=>resolve(record!);tx.onerror=()=>reject(new Error('Local save failed. Check browser storage quota and retry.'));tx.onabort=()=>reject(new Error('Local save failed. Existing saved data was preserved.'));});
    });
  }

  delete(id: string): Promise<void> { return this.enqueue(async()=>{const db=await this.open();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(WORKSPACES,'readwrite');tx.objectStore(WORKSPACES).delete(id);tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('Session deletion failed.'));});}); }
  clearAll(): Promise<void> { return this.enqueue(async()=>{const db=await this.open();await new Promise<void>((resolve,reject)=>{const tx=db.transaction([WORKSPACES,META],'readwrite');tx.objectStore(WORKSPACES).clear();tx.objectStore(META).clear();tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('Local data could not be cleared.'));});}); }

  async loadSpeechDraft(): Promise<SpeechSession | null> {
    const db=await this.open();return new Promise((resolve,reject)=>{const req=db.transaction(META,'readonly').objectStore(META).get('speech-draft');req.onsuccess=()=>{try{resolve(req.result===undefined||req.result.value===null?null:restoreSpeech(req.result.value));}catch{reject(new Error('Saved transcript review is corrupt. It was not changed.'));}};req.onerror=()=>reject(new Error('Saved transcript review could not be loaded.'));});
  }
  async saveSpeechDraft(session: SpeechSession | null): Promise<void> {
    return this.enqueue(async()=>{const value=session===null?null:restoreSpeech(session);if(value && JSON.stringify(value).length>200_000)throw new Error('Transcript review exceeds the local size limit.');const db=await this.open();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(META,'readwrite');tx.objectStore(META).put({key:'speech-draft',value});tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('Transcript review could not be saved locally.'));});});
  }

  async exportBundle(id: string): Promise<WorkspaceBundle> {
    const record=await this.get(id);if(!record)throw new Error('Saved session was not found.');
    return {format:WORKSPACE_EXPORT_FORMAT,schemaVersion:1,workspaceId:record.id,createdAt:record.createdAt,updatedAt:record.updatedAt,workspace:record.workspace,exportMetadata:record.exportMetadata};
  }
  async importBundle(value: unknown): Promise<WorkspaceRecord> {
    const bundle=parseWorkspaceBundle(value), workspace=invalidateImportedConfirmations(bundle.workspace);
    // Always allocate a new ID; imports never overwrite a saved session, even if IDs match.
    return this.save(workspace);
  }
  async markExported(id:string,kind:ExportMetadata['kind'],cardIds:string[]):Promise<WorkspaceRecord>{
    return this.enqueue(async()=>{const record=await this.get(id);if(!record)throw new Error('Saved session was not found.');const validIds=new Set(record.workspace.cards.map(c=>c.id));if(cardIds.some(card=>!validIds.has(card)))throw new Error('Export references an unknown card.');const marked={...record,exportMetadata:[...record.exportMetadata,{kind,exportedAt:new Date().toISOString(),cardIds:[...cardIds]}]};const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction(WORKSPACES,'readwrite');tx.objectStore(WORKSPACES).put(marked);tx.oncomplete=()=>resolve(marked);tx.onerror=tx.onabort=()=>reject(new Error('Export history could not be saved.'));});});
  }

  async migrateLegacy(storage: StoragePort): Promise<{migrated:WorkspaceRecord|null;speechDraft:SpeechSession|null;error:string|null}> {
    try {
      if(storage.getItem(LEGACY_MIGRATION_SETTING)==='complete')return{migrated:null,speechDraft:await this.loadSpeechDraft(),error:null};
      const workspaceText=storage.getItem(STORAGE_KEY),speechText=storage.getItem(SPEECH_STORAGE_KEY);
      let legacyWorkspace:Workspace|null=null, speechDraft:SpeechSession|null=null;
      if(workspaceText!==null){if(workspaceText.length>2_000_000)throw new Error();legacyWorkspace=restoreWorkspace(JSON.parse(workspaceText));}
      if(speechText!==null){if(speechText.length>200_000)throw new Error();speechDraft=restoreSpeech(JSON.parse(speechText));}
      const migrated=legacyWorkspace?await this.save(legacyWorkspace):null;
      if(speechDraft)await this.saveSpeechDraft(speechDraft);
      storage.setItem(LEGACY_MIGRATION_SETTING,'complete');
      if(workspaceText!==null)storage.removeItem(STORAGE_KEY);
      if(speechText!==null)storage.removeItem(SPEECH_STORAGE_KEY);
      return{migrated,speechDraft,error:null};
    } catch { return{migrated:null,speechDraft:null,error:'Legacy local data could not be migrated. Original data was retained; no replacement was written.'}; }
  }
}

export function createBundleDownload(bundle: WorkspaceBundle): string {
  const text=JSON.stringify(bundle,null,2);if(text.length>MAX_BUNDLE_BYTES)throw new Error('Workspace JSON exceeds the export size limit.');return text;
}
