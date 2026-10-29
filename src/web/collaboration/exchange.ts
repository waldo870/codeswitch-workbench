import { parseWorkspaceBundle, type WorkspaceBundle } from '../storage/workspace-db.js';
import { validateRoutineHandoff, type RoutineHandoff } from '../p6g/routine-handoff.js';

export const EXCHANGE_FORMAT = 'codeswitch-workbench-exchange';
export const EXCHANGE_VERSION = 1;
export const EXCHANGE_MAX_BYTES = 5_000_000;
export const EXCHANGE_MAX_PLAINTEXT_BYTES = 4_000_000;
export const EXCHANGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 600_000;
const enc = new TextEncoder();
const dec = new TextDecoder('utf-8', { fatal: true });

export interface CollaborationAssignment {
  cardId: string;
  assignee: string;
  status: 'assigned' | 'in_progress' | 'done' | 'blocked';
  result: string;
  notes: string;
  history: Array<{ at: string; actor: string; field: string; before: string | null; after: string | null }>;
}
export interface CollaborationPayload {
  kind: 'request' | 'reply';
  exchangeId: string;
  sourceWorkspaceId: string;
  baseDigest: string;
  bundle: WorkspaceBundle;
  baseAssignments: CollaborationAssignment[];
  assignments: CollaborationAssignment[];
  /** Optional encrypted P6G sidecar. Legacy P6A exchanges omit this field. */
  routineHandoff?: RoutineHandoff;
}
export interface CollaborationState { localWorkspaceId:string|null; assignments: CollaborationAssignment[]; baseAssignments: CollaborationAssignment[]; role: 'owner'|'collaborator'; peerWorkspaceId: string|null; baseDigest: string|null; sourceExchangeId: string|null; importedAt: string|null }
interface ExchangeHeader { format: typeof EXCHANGE_FORMAT; version: 1; exchangeId: string; createdAt: string; expiresAt: string; salt: string; nonce: string; iterations: number }
export interface EncryptedExchange extends ExchangeHeader { ciphertext: string }

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (value: string) => { if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error('Exchange contains invalid encoded data.'); return Uint8Array.from(atob(value), c => c.charCodeAt(0)); };
const headerOf = (x: ExchangeHeader) => JSON.stringify({format:x.format,version:x.version,exchangeId:x.exchangeId,createdAt:x.createdAt,expiresAt:x.expiresAt,salt:x.salt,nonce:x.nonce,iterations:x.iterations});
const randomId = () => crypto.randomUUID();
const digest = async (value: unknown) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(JSON.stringify(value))))].map(v=>v.toString(16).padStart(2,'0')).join('');

async function derive(password: string, salt: Uint8Array): Promise<CryptoKey> {
  if (password.length < 12 || password.length > 1024) throw new Error('Use an exchange passphrase with at least 12 characters.');
  const material=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
  const stableSalt=new Uint8Array(salt.length);stableSalt.set(salt);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:stableSalt.buffer,iterations:PBKDF2_ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}

export async function createEncryptedExchange(payload: Omit<CollaborationPayload,'exchangeId'>, password: string, now = new Date()): Promise<EncryptedExchange> {
  const checkedBundle=parseWorkspaceBundle(payload.bundle);
  if(payload.routineHandoff)validateRoutineHandoff(payload.routineHandoff,checkedBundle.workspace,payload.kind==='request'?checkedBundle.workspaceId:payload.sourceWorkspaceId);
  const exchangeId=randomId(),createdAt=now.toISOString(),expiresAt=new Date(now.getTime()+EXCHANGE_TTL_MS).toISOString();
  const salt=crypto.getRandomValues(new Uint8Array(16)),nonce=crypto.getRandomValues(new Uint8Array(12));
  const header:ExchangeHeader={format:EXCHANGE_FORMAT,version:1,exchangeId,createdAt,expiresAt,salt:toB64(salt),nonce:toB64(nonce),iterations:PBKDF2_ITERATIONS};
  const plaintext=enc.encode(JSON.stringify({...payload,exchangeId}));
  if(plaintext.length>EXCHANGE_MAX_PLAINTEXT_BYTES)throw new Error('Exchange content exceeds the 4 MB plaintext limit.');
  const key=await derive(password,salt),encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,additionalData:enc.encode(headerOf(header)),tagLength:128},key,plaintext);
  const result={...header,ciphertext:toB64(new Uint8Array(encrypted))};
  if(enc.encode(JSON.stringify(result)).length>EXCHANGE_MAX_BYTES)throw new Error('Encrypted exchange exceeds the 5 MB file limit.');
  return result;
}

export async function decryptExchange(value: unknown, password: string, now = new Date()): Promise<CollaborationPayload> {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid exchange file.');
  const x=value as Record<string,unknown>,keys=['format','version','exchangeId','createdAt','expiresAt','salt','nonce','iterations','ciphertext'];
  if(Object.keys(x).length!==keys.length||keys.some(k=>!Object.hasOwn(x,k))||x.format!==EXCHANGE_FORMAT||x.version!==1||typeof x.exchangeId!=='string'||!/^[0-9a-f-]{36}$/i.test(x.exchangeId)||typeof x.createdAt!=='string'||typeof x.expiresAt!=='string'||typeof x.salt!=='string'||typeof x.nonce!=='string'||typeof x.ciphertext!=='string'||x.iterations!==PBKDF2_ITERATIONS)throw new Error('Unsupported or malformed exchange version.');
  if(enc.encode(JSON.stringify(value)).length>EXCHANGE_MAX_BYTES)throw new Error('Exchange exceeds the 5 MB file limit.');
  const created=Date.parse(x.createdAt),expires=Date.parse(x.expiresAt);
  if(!Number.isFinite(created)||!Number.isFinite(expires)||expires<=now.getTime()||created>now.getTime()+5*60_000||expires-created>EXCHANGE_TTL_MS)throw new Error('Exchange is expired or has an invalid time window.');
  const salt=fromB64(x.salt),nonce=fromB64(x.nonce),ciphertext=fromB64(x.ciphertext);
  if(salt.length!==16||nonce.length!==12||ciphertext.length>EXCHANGE_MAX_PLAINTEXT_BYTES+16)throw new Error('Exchange cryptographic fields are invalid.');
  const header:ExchangeHeader={format:EXCHANGE_FORMAT,version:1,exchangeId:x.exchangeId,createdAt:x.createdAt,expiresAt:x.expiresAt,salt:x.salt,nonce:x.nonce,iterations:PBKDF2_ITERATIONS};
  let plain:ArrayBuffer;
  try{plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce,additionalData:enc.encode(headerOf(header)),tagLength:128},await derive(password,salt),ciphertext);}catch{throw new Error('Exchange authentication failed. Check the passphrase or file integrity.');}
  if(plain.byteLength>EXCHANGE_MAX_PLAINTEXT_BYTES)throw new Error('Decrypted exchange exceeds the 4 MB limit.');
  let parsed:unknown;try{parsed=JSON.parse(dec.decode(plain));}catch{throw new Error('Exchange payload is not valid UTF-8 JSON.');}
  if(!parsed||typeof parsed!=='object')throw new Error('Invalid exchange payload.');
  const p=parsed as CollaborationPayload;
  if(p.exchangeId!==x.exchangeId||!['request','reply'].includes(p.kind)||typeof p.sourceWorkspaceId!=='string'||!/^([0-9a-f]{64})$/.test(p.baseDigest)||!Array.isArray(p.assignments)||p.assignments.length>1000||!Array.isArray(p.baseAssignments)||p.baseAssignments.length>1000)throw new Error('Exchange payload metadata is invalid.');
  const bundle=parseWorkspaceBundle(p.bundle);
  if(p.routineHandoff!==undefined)validateRoutineHandoff(p.routineHandoff,bundle.workspace,p.kind==='request'?bundle.workspaceId:p.sourceWorkspaceId);
  const cards=new Set(bundle.workspace.cards.map(c=>c.id));
  const validAssignments=(values:CollaborationAssignment[])=>{const seen=new Set<string>();for(const a of values){if(!a||!cards.has(a.cardId)||seen.has(a.cardId)||typeof a.assignee!=='string'||a.assignee.length>200||!['assigned','in_progress','done','blocked'].includes(a.status)||typeof a.result!=='string'||a.result.length>5000||typeof a.notes!=='string'||a.notes.length>5000||!Array.isArray(a.history)||a.history.length>500||a.history.some(h=>!h||typeof h.at!=='string'||!Number.isFinite(Date.parse(h.at))||typeof h.actor!=='string'||h.actor.length>200||typeof h.field!=='string'||h.field.length>100||!(h.before===null||typeof h.before==='string'&&h.before.length<=5000)||!(h.after===null||typeof h.after==='string'&&h.after.length<=5000)))throw new Error('Invalid collaboration assignment.');seen.add(a.cardId);}};
  validAssignments(p.assignments);validAssignments(p.baseAssignments);
  if(p.kind==='request'&&(p.sourceWorkspaceId!==bundle.workspaceId||await bundleDigest(bundle)!==p.baseDigest))throw new Error('Request source or base digest does not match its workspace.');
  return {...p,bundle};
}

export async function bundleDigest(bundle: WorkspaceBundle): Promise<string> { return digest(bundle); }
export function makeInitialAssignments(bundle: WorkspaceBundle, actor: string): CollaborationAssignment[] {
  return bundle.workspace.cards.map(card=>({cardId:card.id,assignee:'',status:'assigned',result:'',notes:'',history:[{at:new Date().toISOString(),actor:actor.slice(0,200),field:'assigned',before:null,after:''}]}));
}
export function mergeAssignments(base: CollaborationAssignment[], local: CollaborationAssignment[], reply: CollaborationAssignment[]): { merged: CollaborationAssignment[]; conflicts: string[] } {
  const original=new Map(base.map(a=>[a.cardId,a])),localMap=new Map(local.map(a=>[a.cardId,a])),incoming=new Map(reply.map(a=>[a.cardId,a])),conflicts:string[]=[],merged:CollaborationAssignment[]=[];
  for(const [id,b] of original){const l=localMap.get(id)??b,r=incoming.get(id);if(!r){merged.push(structuredClone(l));continue;}
    const fields=['assignee','status','result','notes'] as const;let hasConflict=false;const value:CollaborationAssignment={...structuredClone(b)};
    for(const key of fields){const lc=l[key]!==b[key],rc=r[key]!==b[key];if(lc&&rc&&l[key]!==r[key]){hasConflict=true;continue;}if(rc)Object.assign(value,{[key]:r[key]});else if(lc)Object.assign(value,{[key]:l[key]});}
    if(hasConflict)conflicts.push(`${id}: concurrent edits`);
    merged.push({...value,history:[...l.history,...r.history]});
  }
  return {merged,conflicts};
}
