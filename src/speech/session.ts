import type { SpeechResult, SpeechSession, SpeechProvenance } from '../contracts/speech.js';
export const MAX_TRANSCRIPT = 10000;
const only=(value:object,keys:string[])=>Object.keys(value).every(k=>keys.includes(k));
const errorCodes=['UNAVAILABLE','TIMEOUT','CANCELLED','FORMAT','CORRUPTED_AUDIO','TOO_LARGE','TOO_LONG','EMPTY_TRANSCRIPT','MALFORMED_RESPONSE','MISSING_MODEL','HARDWARE_UNAVAILABLE','WORKER_PROTOCOL','WORKER_ERROR','PROVIDER_ERROR'];
export function assertSpeechResult(value: unknown, id: string, duration: number): asserts value is SpeechResult {
 const r = value as SpeechResult;
 if (!r || r.sourceAudioId !== id || r.duration !== duration || !Number.isFinite(r.inferenceDuration) || r.inferenceDuration < 0 || typeof r.transcript !== 'string' || r.transcript.length > MAX_TRANSCRIPT || !['success','failed','cancelled'].includes(r.status) || !Array.isArray(r.errors) || r.errors.some(e => !e || typeof e.code !== 'string' || typeof e.message !== 'string') || typeof r.modelId !== 'string' || !r.modelId || r.modelId.length>200 || typeof r.provider !== 'string' || !r.provider || r.provider.length>200 || !(r.language === null || typeof r.language === 'string' && r.language.length<=50) || (r.confidence !== undefined && (!Number.isFinite(r.confidence) || r.confidence < 0 || r.confidence > 1))) throw new Error('Malformed ASR response.');
 if(!only(r,['sourceAudioId','transcript','language','modelId','provider','duration','inferenceDuration','confidence','timing','audioFormat','runtime','status','errors']) || r.errors.length>10 || r.errors.some(e=>!errorCodes.includes(e.code) || e.message.length>500) || r.provider==='windows-whisper' && r.confidence!==undefined)throw new Error('Unsupported ASR response fields.');
 if(r.timing && (!only(r.timing,['modelLoadDurationMs','transcriptionDurationMs']) || !Number.isFinite(r.timing.modelLoadDurationMs) || r.timing.modelLoadDurationMs<0 || !Number.isFinite(r.timing.transcriptionDurationMs) || r.timing.transcriptionDurationMs<0))throw new Error('Invalid ASR phase timing.');
 if(r.audioFormat && (!only(r.audioFormat,['container','encoding','sampleRateHz','channels','bitsPerSample']) || r.audioFormat.container!=='wav' || r.audioFormat.encoding!=='pcm_s16le' || r.audioFormat.sampleRateHz!==16000 || r.audioFormat.channels!==1 || r.audioFormat.bitsPerSample!==16))throw new Error('Invalid ASR audio format metadata.');
 if(r.runtime && (!only(r.runtime,['mode','runtime','device','version','architecture']) || !['live','mock'].includes(r.runtime.mode) || typeof r.runtime.runtime!=='string' || !r.runtime.runtime || r.runtime.runtime.length>100 || !['cpu','hailo','unknown'].includes(r.runtime.device) || r.runtime.version!==undefined && (typeof r.runtime.version!=='string' || r.runtime.version.length>100) || r.runtime.architecture!==undefined && (typeof r.runtime.architecture!=='string' || r.runtime.architecture.length>100)))throw new Error('Invalid ASR runtime metadata.');
 if(r.status!=='success' && (r.transcript!=='' || !r.errors.length))throw new Error('Invalid failed ASR result.');
 if (r.status==='success' && (!r.transcript.trim() || r.errors.length)) throw new Error('Empty or invalid successful transcript.');
}
export function restoreSpeech(value: unknown): SpeechSession {
 const s = value as SpeechSession, a = s?.source;
 if (!s || s.schemaVersion!==1 || !a || !/^sha256:[0-9a-f]{64}$/.test(a.id) || typeof a.name!=='string' || a.name.length>200 || !Number.isInteger(a.bytes) || a.bytes<44 || a.bytes>4_000_000 || !Number.isFinite(a.duration) || a.duration<=0 || a.duration>120 || a.format!=='wav' || a.sampleRate!==16000 || a.channels!==1 || a.bitsPerSample!==16 || !Array.isArray(s.edits) || s.edits.length>500) throw new Error('Invalid speech session.');
 if(!only(s,['schemaVersion','source','recognition','transcript','edits','revision','confirmedRevision']) || !only(a,['id','name','bytes','duration','format','sampleRate','channels','bitsPerSample']))throw new Error('Unexpected speech fields.');
 assertSpeechResult(s.recognition,a.id,a.duration);
 if(s.recognition.audioFormat && (s.recognition.audioFormat.container!==a.format || s.recognition.audioFormat.sampleRateHz!==a.sampleRate || s.recognition.audioFormat.channels!==a.channels || s.recognition.audioFormat.bitsPerSample!==a.bitsPerSample))throw new Error('ASR audio format does not match its source.');
 if (s.recognition.status!=='success') throw new Error('A successful ASR transcript is required.');
 let text=s.recognition.transcript;
 for(const e of s.edits) { if (!e || !only(e,['before','after']) || e.before!==text || typeof e.after!=='string' || e.after.length>MAX_TRANSCRIPT) throw new Error('Invalid transcript edit history.'); text=e.after; }
 if(s.transcript!==text || s.revision!==s.edits.length || !(s.confirmedRevision===null || s.confirmedRevision===s.revision && text.trim())) throw new Error('Stale or invalid transcript confirmation.');
 return structuredClone(s);
}
export function newSpeech(source: SpeechSession['source'], recognition: SpeechResult): SpeechSession { return restoreSpeech({schemaVersion:1,source,recognition,transcript:recognition.transcript,edits:[],revision:0,confirmedRevision:null}); }
export function editTranscript(value: SpeechSession, text: string): SpeechSession {
 const s=restoreSpeech(value); if(s.transcript===text)return s;
 const last=s.edits.at(-1);
 if(s.confirmedRevision===null && last){last.after=text;s.transcript=text;return restoreSpeech(s);}
 s.edits.push({before:s.transcript,after:text});s.transcript=text;s.revision++;s.confirmedRevision=null;return restoreSpeech(s);
}
export function confirmTranscript(value: SpeechSession): SpeechSession { const s=restoreSpeech(value);if(!s.transcript.trim())throw new Error('Transcript is empty.');s.confirmedRevision=s.revision;return restoreSpeech(s); }
export function speechProvenance(value: SpeechSession): SpeechProvenance { const session=restoreSpeech(value);if(session.confirmedRevision!==session.revision)throw new Error('Confirm the transcript before analysis.');return {session,origin:session.edits.length?'corrected-transcript':'raw-asr'}; }
export function validateSpeechProvenance(value: SpeechProvenance, input: string): SpeechProvenance {const expected=speechProvenance(value.session);if(expected.origin!==value.origin || expected.session.transcript!==input)throw new Error('Speech source does not match analyzed text.');return expected;}
