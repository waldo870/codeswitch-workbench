import { WORKSPACE_DB_NAME, WORKSPACE_DB_VERSION } from './workspace-db.js';

/** Namespaced IndexedDB extension data. Extensions own their JSON contracts and validation. */
export type WorkspaceExtensionNamespace = 'p6d.translation' | 'p6e.routine-templates' | 'p6g.routine-handoff' | 'p6g.time-to-value';
export const EXTENSION_VALUE_MAX_BYTES = 1_000_000;
const META = 'meta';
const KEY_PREFIX = 'workspace-extension:';

export interface WorkspaceExtensionStore {
  get<T>(namespace: WorkspaceExtensionNamespace, id: string): Promise<T | null>;
  put<T>(namespace: WorkspaceExtensionNamespace, id: string, value: T): Promise<void>;
  delete(namespace: WorkspaceExtensionNamespace, id: string): Promise<void>;
}

const validId=(id:string)=>id.length>0&&id.length<=200&&!/[\\/\u0000-\u001f]/.test(id);
const keyOf=(namespace:WorkspaceExtensionNamespace,id:string)=>{
  if(!['p6d.translation','p6e.routine-templates','p6g.routine-handoff','p6g.time-to-value'].includes(namespace)||!validId(id))throw new Error('Invalid local workspace extension key.');
  return `${KEY_PREFIX}${namespace}:${id}`;
};

export class IndexedDbWorkspaceExtensionStore implements WorkspaceExtensionStore {
  private database:Promise<IDBDatabase>|null=null;
  constructor(private readonly factory:IDBFactory|undefined=globalThis.indexedDB){}
  private open():Promise<IDBDatabase>{
    if(!this.factory)return Promise.reject(new Error('IndexedDB is unavailable.'));
    if(this.database)return this.database;
    this.database=new Promise((resolve,reject)=>{
      const request=this.factory!.open(WORKSPACE_DB_NAME,WORKSPACE_DB_VERSION);
      request.onupgradeneeded=()=>{request.transaction?.abort();reject(new Error('Workspace extension store cannot initialize or upgrade the shared database. Open CodeSwitch once and retry.'));};
      request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains(META)){db.close();this.database=null;reject(new Error('Workspace database is missing its metadata store.'));return;}db.onversionchange=()=>{db.close();this.database=null;};resolve(db);};
      request.onerror=()=>{this.database=null;reject(new Error('Workspace extension database could not be opened.'));};
      request.onblocked=()=>{this.database=null;reject(new Error('Workspace extension database upgrade is blocked by another tab.'));};
    });
    return this.database;
  }
  async get<T>(namespace:WorkspaceExtensionNamespace,id:string):Promise<T|null>{
    const key=keyOf(namespace,id),db=await this.open();
    return new Promise((resolve,reject)=>{const request=db.transaction(META,'readonly').objectStore(META).get(key);request.onsuccess=()=>{if(request.result===undefined){resolve(null);return;}try{const serialized=JSON.stringify(request.result.value);if(serialized===undefined||new TextEncoder().encode(serialized).length>EXTENSION_VALUE_MAX_BYTES)throw new Error();resolve(structuredClone(request.result.value) as T);}catch{reject(new Error('Saved extension data is invalid or exceeds its size limit.'));}};request.onerror=()=>reject(new Error('Workspace extension data could not be loaded.'));});
  }
  async put<T>(namespace:WorkspaceExtensionNamespace,id:string,value:T):Promise<void>{
    const key=keyOf(namespace,id);let serialized:string;try{serialized=JSON.stringify(value);}catch{throw new Error('Workspace extension data must be serializable JSON.');}
    if(serialized===undefined||new TextEncoder().encode(serialized).length>EXTENSION_VALUE_MAX_BYTES)throw new Error('Workspace extension data exceeds the 1 MB limit.');
    const db=await this.open();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(META,'readwrite');tx.objectStore(META).put({key,value:JSON.parse(serialized)});tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('Workspace extension data could not be saved locally.'));});
  }
  async delete(namespace:WorkspaceExtensionNamespace,id:string):Promise<void>{const key=keyOf(namespace,id),db=await this.open();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(META,'readwrite');tx.objectStore(META).delete(key);tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('Workspace extension data could not be deleted.'));});}
}
