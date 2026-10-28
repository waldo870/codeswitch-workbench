import type { AudioSource, SpeechResult } from '../contracts/speech.js';
import { assertSpeechResult } from './session.js';
export interface SpeechClient { capabilities():Promise<{configured:boolean}>; transcribe(bytes:Uint8Array,source:AudioSource,signal:AbortSignal):Promise<SpeechResult> }
export const browserSpeechClient:SpeechClient={
 async capabilities(){const r=await fetch('/api/speech/capabilities',{cache:'no-store'});if(!r.ok)throw new Error('Local speech service unavailable.');const value=await r.json();return {configured:value.configured===true};},
 async transcribe(bytes,source,signal){
  const response=await fetch('/api/speech/transcribe',{method:'POST',headers:{'Content-Type':'audio/wav','X-CodeSwitch-Speech':'1'},body:new Uint8Array(bytes).buffer,signal});
  if(!response.ok)throw new Error(response.status===503?'Local ASR unavailable. Your workspace was preserved.':'Speech request failed. Your workspace was preserved.');
  const text=await response.text();if(text.length>100000)throw new Error('Speech response too large.');
  const result:unknown=JSON.parse(text);assertSpeechResult(result,source.id,source.duration);return result;
 }
};
