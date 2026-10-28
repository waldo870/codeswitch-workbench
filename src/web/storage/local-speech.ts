import { restoreSpeech } from '../../speech/session.js';
import type { SpeechSession } from '../../contracts/speech.js';
import type { StoragePort } from './local-workspace.js';
export const SPEECH_STORAGE_KEY='codeswitch-workbench.speech.v1';
export function loadSpeech(storage:StoragePort):{session:SpeechSession|null;error:string|null}{try{const raw=storage.getItem(SPEECH_STORAGE_KEY);if(raw===null)return{session:null,error:null};if(raw.length>200000)throw new Error();return{session:restoreSpeech(JSON.parse(raw)),error:null};}catch{return{session:null,error:'Speech data could not be restored. It was not overwritten. Clear Local Data to recover.'};}}
export function saveSpeech(storage:StoragePort,session:SpeechSession){const text=JSON.stringify(restoreSpeech(session));if(text.length>200000)throw new Error('Speech review history is too large.');storage.setItem(SPEECH_STORAGE_KEY,text);}
