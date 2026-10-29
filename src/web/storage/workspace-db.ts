import type { SpeechSession } from '../../contracts/speech.js';
import { restoreSpeech } from '../../speech/session.js';
import { editCard, rejectCard, restoreWorkspace, type Workspace } from '../state/workspace.js';
import { SPEECH_STORAGE_KEY } from './local-speech.js';
import { STORAGE_KEY, type StoragePort } from './local-workspace.js';
import { resetImportedFeedback, validateFeedbackCollections, type FeedbackCollections, type FeedbackRecord, type ImprovementProposal, type ImprovementSession } from '../feedback/model.js';

export const WORKSPACE_DB_NAME = 'codeswitch-workbench';
export const WORKSPACE_DB_VERSION = 2;
export const WORKSPACE_EXPORT_FORMAT = 'codeswitch-workspace';
export const ACTIVE_WORKSPACE_SETTING = 'codeswitch-workbench.active-workspace';
export const LEGACY_MIGRATION_SETTING = 'codeswitch-workbench.localstorage-migration.v1';
const WORKSPACES = 'workspaces';
const META = 'meta';
const MAX_BUNDLE_BYTES = 4_000_000;

export interface ExportMetadata { kind: 'workspace-json' | 'confirmed-workcards-json'; exportedAt: string; cardIds: string[] }
export interface WorkspaceRecord {
  id: string;
  schemaVersion: 2;
  createdAt: string;
  updatedAt: string;
  workspace: Workspace;
  audioMetadata: null | { sha256: string; name: string; bytes: number; durationSeconds: number; format: 'wav'; sampleRateHz: 16000; channels: 1; bitsPerSample: 16 };
  asrMetadata: null | { providerId: string; modelId: string; runtime: NonNullable<SpeechSession['recognition']['runtime']> | null; executionMode: 'live' | 'mock' | 'unknown' };
  rawTranscript: string | null;
  transcriptCorrections: SpeechSession['edits'];
  constraints: Workspace['parsed']['constraints'];
  exportMetadata: ExportMetadata[];
  feedbacks: FeedbackRecord[];
  proposals: ImprovementProposal[];
  improvementSessions: ImprovementSession[];
}
export interface WorkspaceBundle extends FeedbackCollections { format: typeof WORKSPACE_EXPORT_FORMAT; schemaVersion: 2; workspaceId: string; createdAt: string; updatedAt: string; workspace: Workspace; exportMetadata: ExportMetadata[] }
export interface WorkspaceListResult { records: WorkspaceRecord[]; errors: string[] }
export interface P4GReviewEntry { id:string; source:Record<string,unknown>; category:string; originalIssue:string; expectedBehavior:string; reproductionEvidence:Record<string,unknown>; reviewStatus:'unreviewed'|'reviewed'|'accepted_for_investigation'|'dismissed'; verifiedDefect:false; proposal:{title:string;acceptanceCriteria:string[]} }
export interface WorkspaceRepository {
  list(): Promise<WorkspaceListResult>;
  get(id: string): Promise<WorkspaceRecord | null>;
  save(workspace: Workspace, id?: string, collections?: FeedbackCollections): Promise<WorkspaceRecord>;
  saveFeedbackCollections(id: string, collections: FeedbackCollections): Promise<WorkspaceRecord>;
  delete(id: string): Promise<void>;
  clearAll(): Promise<void>;
  loadSpeechDraft(): Promise<SpeechSession | null>;
  saveSpeechDraft(session: SpeechSession | null): Promise<void>;
  exportBundle(id: string): Promise<WorkspaceBundle>;
  importBundle(value: unknown): Promise<WorkspaceRecord>;
  markExported(id: string, kind: ExportMetadata['kind'], cardIds: string[]): Promise<WorkspaceRecord>;
  getCollaboration(id: string): Promise<import('../collaboration/exchange.js').CollaborationState>;
  saveCollaboration(id: string, state: import('../collaboration/exchange.js').CollaborationState): Promise<void>;
  claimExchange(id: string): Promise<boolean>;
  getP4GBacklog(): Promise<P4GReviewEntry[] | null>;
  saveP4GBacklog(entries: P4GReviewEntry[]): Promise<void>;
  migrateLegacy(storage: StoragePort): Promise<{ migrated: WorkspaceRecord | null; speechDraft: SpeechSession | null; error: string | null }>;
}

function validP4GEntry(value:unknown):value is P4GReviewEntry {
  if(!value||typeof value!=='object')return false;const r=value as P4GReviewEntry;
  return ownKeys(r,['id','source','category','originalIssue','expectedBehavior','reproductionEvidence','reviewStatus','verifiedDefect','proposal'])&&typeof r.id==='string'&&r.id.length<=200&&!!r.source&&typeof r.source==='object'&&['live','research','synthetic'].includes(String(r.source.kind))&&typeof r.category==='string'&&r.category.length<=100&&typeof r.originalIssue==='string'&&r.originalIssue.length<=10_000&&typeof r.expectedBehavior==='string'&&r.expectedBehavior.length<=10_000&&!!r.reproductionEvidence&&typeof r.reproductionEvidence==='object'&&['unreviewed','reviewed','accepted_for_investigation','dismissed'].includes(r.reviewStatus)&&r.verifiedDefect===false&&!!r.proposal&&ownKeys(r.proposal,['title','acceptanceCriteria'])&&typeof r.proposal.title==='string'&&r.proposal.title.length<=500&&Array.isArray(r.proposal.acceptanceCriteria)&&r.proposal.acceptanceCriteria.length<=100&&r.proposal.acceptanceCriteria.every(x=>typeof x==='string'&&x.length<=2000);
}

const iso = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const ownKeys = (value: object, keys: string[]) => Object.keys(value).every(key => keys.includes(key)) && keys.every(key => Object.hasOwn(value, key));
const randomId = () => globalThis.crypto.randomUUID();

function buildRecord(id: string, workspaceValue: unknown, previous?: WorkspaceRecord, collections?: FeedbackCollections): WorkspaceRecord {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid workspace ID.');
  const workspace = restoreWorkspace(workspaceValue);
  const session = workspace.speech?.session;
  const now = new Date().toISOString();
  return {
    id, schemaVersion: 2, createdAt: previous?.createdAt ?? now, updatedAt: now, workspace,
    audioMetadata: session ? { sha256: session.source.id, name: session.source.name, bytes: session.source.bytes, durationSeconds: session.source.duration, format: session.source.format, sampleRateHz: session.source.sampleRate, channels: session.source.channels, bitsPerSample: session.source.bitsPerSample } : null,
    asrMetadata: session ? { providerId: session.recognition.provider, modelId: session.recognition.modelId, runtime: session.recognition.runtime ?? null, executionMode: session.recognition.runtime?.mode ?? 'unknown' } : null,
    rawTranscript: session?.recognition.transcript ?? null,
    transcriptCorrections: session ? structuredClone(session.edits) : [],
    constraints: structuredClone(workspace.parsed.constraints),
    exportMetadata: previous ? structuredClone(previous.exportMetadata) : [],
    feedbacks: structuredClone(collections?.feedbacks ?? previous?.feedbacks ?? []),
    proposals: structuredClone(collections?.proposals ?? previous?.proposals ?? []),
    improvementSessions: structuredClone(collections?.improvementSessions ?? previous?.improvementSessions ?? []),
  };
}

export function validateWorkspaceRecord(value: unknown): WorkspaceRecord {
  if (!value || typeof value !== 'object') throw new Error('Invalid workspace record.');
  const r = value as WorkspaceRecord;
  if (!ownKeys(r, ['id','schemaVersion','createdAt','updatedAt','workspace','audioMetadata','asrMetadata','rawTranscript','transcriptCorrections','constraints','exportMetadata','feedbacks','proposals','improvementSessions']) || r.schemaVersion !== 2 || !iso(r.createdAt) || !iso(r.updatedAt) || !Array.isArray(r.exportMetadata) || r.exportMetadata.length > 1000) throw new Error('Unsupported workspace record schema.');
  const rebuilt = buildRecord(r.id, r.workspace, r);
  if (r.audioMetadata !== null && JSON.stringify(r.audioMetadata) !== JSON.stringify(rebuilt.audioMetadata) || r.asrMetadata !== null && JSON.stringify(r.asrMetadata) !== JSON.stringify(rebuilt.asrMetadata) || r.rawTranscript !== rebuilt.rawTranscript || JSON.stringify(r.transcriptCorrections) !== JSON.stringify(rebuilt.transcriptCorrections) || JSON.stringify(r.constraints) !== JSON.stringify(rebuilt.constraints) || !Array.isArray(r.transcriptCorrections) || !Array.isArray(r.constraints) || r.exportMetadata.some(item => !item || !ownKeys(item, ['kind','exportedAt','cardIds']) || !['workspace-json','confirmed-workcards-json'].includes(item.kind) || !iso(item.exportedAt) || !Array.isArray(item.cardIds) || item.cardIds.length > 1000 || item.cardIds.some(id => typeof id !== 'string'))) throw new Error('Workspace provenance or export metadata was changed.');
  const collections = validateFeedbackCollections(r.id, rebuilt.workspace, { feedbacks: r.feedbacks, proposals: r.proposals, improvementSessions: r.improvementSessions });
  return { ...structuredClone(r), ...collections };
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
  const schemaVersion = (value as { schemaVersion?: unknown }).schemaVersion;
  const common = ['format','schemaVersion','workspaceId','createdAt','updatedAt','workspace','exportMetadata'];
  const keys = schemaVersion === 1 ? common : [...common,'feedbacks','proposals','improvementSessions'];
  if (!ownKeys(b, keys) || b.format !== WORKSPACE_EXPORT_FORMAT || ![1,2].includes(schemaVersion as number) || !/^[0-9a-f-]{36}$/i.test(b.workspaceId) || !iso(b.createdAt) || !iso(b.updatedAt) || !Array.isArray(b.exportMetadata) || b.exportMetadata.length > 1000) throw new Error('Unsupported workspace JSON format or version.');
  const collections: FeedbackCollections = schemaVersion === 1 ? { feedbacks: [], proposals: [], improvementSessions: [] } : { feedbacks: (value as WorkspaceBundle).feedbacks, proposals: (value as WorkspaceBundle).proposals, improvementSessions: (value as WorkspaceBundle).improvementSessions };
  const record = validateWorkspaceRecord({ ...buildRecord(b.workspaceId, b.workspace, undefined, collections), createdAt: b.createdAt, updatedAt: b.updatedAt, exportMetadata: b.exportMetadata });
  return { format: WORKSPACE_EXPORT_FORMAT, schemaVersion: 2, workspaceId: record.id, createdAt: record.createdAt, updatedAt: record.updatedAt, workspace: record.workspace, exportMetadata: record.exportMetadata, feedbacks: record.feedbacks, proposals: record.proposals, improvementSessions: record.improvementSessions };
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
      request.onupgradeneeded = event => {
        const db = request.result;
        if (!db.objectStoreNames.contains(WORKSPACES)) db.createObjectStore(WORKSPACES, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' });
        if (event.oldVersion === 1) {
          const cursorRequest = request.transaction!.objectStore(WORKSPACES).openCursor();
          cursorRequest.onsuccess = () => { const cursor = cursorRequest.result; if (!cursor) return; const row = cursor.value as Record<string, unknown>; if (row.schemaVersion === 1) cursor.update({ ...row, schemaVersion: 2, feedbacks: [], proposals: [], improvementSessions: [] }); cursor.continue(); };
        }
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

  save(workspaceValue: Workspace, id: string = randomId(), collections?: FeedbackCollections): Promise<WorkspaceRecord> {
    return this.enqueue(async () => {
      const workspace=restoreWorkspace(workspaceValue), db=await this.open();
      return new Promise((resolve,reject)=>{const tx=db.transaction(WORKSPACES,'readwrite'),store=tx.objectStore(WORKSPACES),get=store.get(id);let record:WorkspaceRecord;get.onsuccess=()=>{try{const previous=get.result===undefined?undefined:validateWorkspaceRecord(get.result);record=validateWorkspaceRecord(buildRecord(id,workspace,previous,collections));store.put(record);}catch(e){tx.abort();reject(e);}};get.onerror=()=>{tx.abort();reject(new Error('Saved session could not be read before update.'));};tx.oncomplete=()=>resolve(record!);tx.onerror=()=>reject(new Error('Local save failed. Check browser storage quota and retry.'));tx.onabort=()=>reject(new Error('Local save failed. Existing saved data was preserved.'));});
    });
  }

  saveFeedbackCollections(id: string, collections: FeedbackCollections): Promise<WorkspaceRecord> {
    return this.enqueue(async()=>{const record=await this.get(id);if(!record)throw new Error('Saved session was not found.');const validated=validateFeedbackCollections(id,record.workspace,collections);const updated:WorkspaceRecord={...record,...validated,updatedAt:new Date().toISOString()};const db=await this.open();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(WORKSPACES,'readwrite');tx.objectStore(WORKSPACES).put(updated);tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('Feedback could not be saved locally.'));});return updated;});
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
    return {format:WORKSPACE_EXPORT_FORMAT,schemaVersion:2,workspaceId:record.id,createdAt:record.createdAt,updatedAt:record.updatedAt,workspace:record.workspace,exportMetadata:record.exportMetadata,feedbacks:record.feedbacks,proposals:record.proposals,improvementSessions:record.improvementSessions};
  }
  async importBundle(value: unknown): Promise<WorkspaceRecord> {
    const bundle=parseWorkspaceBundle(value), workspace=invalidateImportedConfirmations(bundle.workspace), id=randomId();
    const collections=resetImportedFeedback(bundle,bundle.workspaceId,id);
    // Always allocate a new ID; imports never overwrite a saved session, even if IDs match.
    return this.save(workspace,id,collections);
  }
  async markExported(id:string,kind:ExportMetadata['kind'],cardIds:string[]):Promise<WorkspaceRecord>{
    return this.enqueue(async()=>{const record=await this.get(id);if(!record)throw new Error('Saved session was not found.');const validIds=new Set(record.workspace.cards.map(c=>c.id));if(cardIds.some(card=>!validIds.has(card)))throw new Error('Export references an unknown card.');const marked={...record,exportMetadata:[...record.exportMetadata,{kind,exportedAt:new Date().toISOString(),cardIds:[...cardIds]}]};const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction(WORKSPACES,'readwrite');tx.objectStore(WORKSPACES).put(marked);tx.oncomplete=()=>resolve(marked);tx.onerror=tx.onabort=()=>reject(new Error('Export history could not be saved.'));});});
  }

  async getCollaboration(id:string):Promise<import('../collaboration/exchange.js').CollaborationState>{
    const db=await this.open();return new Promise((resolve,reject)=>{const req=db.transaction(META,'readonly').objectStore(META).get(`collaboration:${id}`);req.onsuccess=()=>{const value=req.result?.value;if(value===undefined){resolve({localWorkspaceId:id,assignments:[],baseAssignments:[],role:'owner',peerWorkspaceId:null,baseDigest:null,sourceExchangeId:null,importedAt:null});return;}const validList=(list:unknown)=>Array.isArray(list)&&list.length<=1000&&list.every(a=>a&&typeof a==='object'&&ownKeys(a,['cardId','assignee','status','result','notes','history'])&&typeof a.cardId==='string'&&a.cardId.length<=100&&typeof a.assignee==='string'&&a.assignee.length<=200&&['assigned','in_progress','done','blocked'].includes(a.status as string)&&typeof a.result==='string'&&a.result.length<=5000&&typeof a.notes==='string'&&a.notes.length<=5000&&Array.isArray(a.history)&&a.history.length<=500&&a.history.every((h:unknown)=>!!h&&typeof h==='object'&&ownKeys(h as object,['at','actor','field','before','after'])&&iso((h as {at:unknown}).at)&&typeof (h as {actor:unknown}).actor==='string'&&typeof (h as {field:unknown}).field==='string'&&((h as {before:unknown}).before===null||typeof (h as {before:unknown}).before==='string')&&((h as {after:unknown}).after===null||typeof (h as {after:unknown}).after==='string')));if(!value||!ownKeys(value,['localWorkspaceId','assignments','baseAssignments','role','peerWorkspaceId','baseDigest','sourceExchangeId','importedAt'])||value.localWorkspaceId!==id||!validList(value.assignments)||!validList(value.baseAssignments)||!['owner','collaborator'].includes(value.role)||!(value.peerWorkspaceId===null||typeof value.peerWorkspaceId==='string')||!(value.baseDigest===null||/^[0-9a-f]{64}$/.test(value.baseDigest))||!(value.sourceExchangeId===null||typeof value.sourceExchangeId==='string')||!(value.importedAt===null||iso(value.importedAt))){reject(new Error('Saved collaboration data is corrupt.'));return;}resolve(structuredClone(value));};req.onerror=()=>reject(new Error('Collaboration data could not be loaded.'));});
  }
  async saveCollaboration(id:string,state:import('../collaboration/exchange.js').CollaborationState):Promise<void>{
    if(!/^[0-9a-f-]{36}$/i.test(id)||!state||state.localWorkspaceId!==id||!Array.isArray(state.assignments)||state.assignments.length>1000||JSON.stringify(state).length>250_000)throw new Error('Collaboration data exceeds its local limits.');
    const db=await this.open();await new Promise<void>((resolve,reject)=>{const tx=db.transaction([WORKSPACES,META],'readwrite'),get=tx.objectStore(WORKSPACES).get(id);get.onsuccess=()=>{try{if(!get.result)throw new Error('Saved session was not found.');const record=validateWorkspaceRecord(get.result),cards=new Set(record.workspace.cards.map(c=>c.id));if(state.assignments.some(a=>!cards.has(a.cardId)))throw new Error('Assignment references a card outside this workspace.');tx.objectStore(META).put({key:`collaboration:${id}`,value:structuredClone(state)});}catch(e){tx.abort();reject(e);}};tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('Collaboration state could not be saved locally.'));});
  }
  async claimExchange(id:string):Promise<boolean>{
    if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Invalid exchange identifier.');const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction(META,'readwrite'),store=tx.objectStore(META),key=`exchange-used:${id}`,get=store.get(key);let claimed=false;get.onsuccess=()=>{if(get.result){claimed=false;return;}claimed=true;store.put({key,value:new Date().toISOString()});};tx.oncomplete=()=>resolve(claimed);tx.onerror=tx.onabort=()=>reject(new Error('Exchange replay check failed.'));});
  }
  async getP4GBacklog():Promise<P4GReviewEntry[]|null>{const db=await this.open();return new Promise((resolve,reject)=>{const req=db.transaction(META,'readonly').objectStore(META).get('p4g-review-backlog-v1');req.onsuccess=()=>{const rows=req.result?.value;if(rows===undefined){resolve(null);return;}if(!Array.isArray(rows)||rows.length>100||rows.some((r:unknown)=>!validP4GEntry(r))){reject(new Error('Saved P4G review backlog is invalid.'));return;}resolve(structuredClone(rows));};req.onerror=()=>reject(new Error('P4G backlog could not be read.'));});}
  async saveP4GBacklog(entries:P4GReviewEntry[]):Promise<void>{if(!Array.isArray(entries)||entries.length>100||entries.some(r=>!validP4GEntry(r))||new Set(entries.map(r=>r.id)).size!==entries.length||JSON.stringify(entries).length>500_000)throw new Error('P4G backlog data is invalid or too large.');const db=await this.open();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(META,'readwrite');tx.objectStore(META).put({key:'p4g-review-backlog-v1',value:structuredClone(entries)});tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('P4G backlog was not saved locally.'));});}

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
