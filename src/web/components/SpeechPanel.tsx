import { useEffect, useRef, useState } from 'react';
import type { AudioSource, SpeechProvenance, SpeechSession } from '../../contracts/speech.js';
import { identifyAudio } from '../../speech/audio.js';
import { browserSpeechClient, type SpeechClient } from '../../speech/client.js';
import { newSpeech, editTranscript, confirmTranscript, speechProvenance } from '../../speech/session.js';
import { loadSpeech, saveSpeech } from '../storage/local-speech.js';
import type { StoragePort } from '../storage/local-workspace.js';
export function SpeechPanel({storage,onAnalyze,onInvalidate,onAvailability,client=browserSpeechClient}:{storage:StoragePort;onAnalyze:(p:SpeechProvenance)=>void;onInvalidate:()=>void;onAvailability:(ready:boolean)=>void;client?:SpeechClient}){
 const [initial]=useState(()=>loadSpeech(storage));
 const [session,setSession]=useState<SpeechSession|null>(initial.session);
 const [audio,setAudio]=useState<{bytes:Uint8Array;source:AudioSource}|null>(null);
 const [configured,setConfigured]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(initial.error??''),[saveMessage,setSaveMessage]=useState(initial.session?'Speech review restored; reimport audio to transcribe again.':'Browser audio stays in memory; the local worker uses a private temporary WAV that is removed after recognition. Audio is never saved to localStorage.');
 const [pendingAudio,setPendingAudio]=useState<{bytes:Uint8Array;source:AudioSource}|null>(null);
 const request=useRef<AbortController|null>(null), generation=useRef(0),fileGeneration=useRef(0);
 useEffect(()=>{let active=true;client.capabilities().then(c=>{if(active){setConfigured(c.configured);onAvailability(c.configured);}}).catch(()=>{if(active){setConfigured(false);onAvailability(false);}});return()=>{active=false;generation.current++;request.current?.abort();};},[client]);
 const persist=(next:SpeechSession)=>{setSession(next);try{saveSpeech(storage,next);setSaveMessage('Transcript review saved locally; audio bytes are not stored.');}catch{setSaveMessage('Speech save failed. Review remains in memory; reload may lose changes.');}};
 const replaceAudio=(value:{bytes:Uint8Array;source:AudioSource})=>{generation.current++;request.current?.abort();setBusy(false);onInvalidate();setAudio(value);setSession(null);setPendingAudio(null);setError('');setSaveMessage('New audio selected. Saved previous review is retained until successful transcription.');};
 async function select(file:File|undefined){if(!file)return;const selection=++fileGeneration.current;try{if(file.size>4_000_000)throw new Error('Audio exceeds 4 MB.');const bytes=new Uint8Array(await file.arrayBuffer());const source=await identifyAudio(bytes,file.name);if(selection!==fileGeneration.current)return;if(session){setPendingAudio({bytes,source});}else replaceAudio({bytes,source});}catch(e){if(selection===fileGeneration.current)setError(e instanceof Error?e.message:'Invalid audio.');}}
 async function transcribe(){if(!audio || busy)return;const token=++generation.current;request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError('');
  try{const result=await client.transcribe(audio.bytes,audio.source,controller.signal);if(token!==generation.current || controller.signal.aborted)return;if(result.status!=='success')throw new Error(result.errors[0]?.message??'Transcription failed.');persist(newSpeech(audio.source,result));}
  catch(e){if(token===generation.current)setError(controller.signal.aborted?'Transcription cancelled. Previous workspace preserved.':e instanceof Error?e.message:'Transcription failed.');}
  finally{if(token===generation.current)setBusy(false);}
 }
 return <section className="panel speech-panel" aria-labelledby="speech-heading"><h2 id="speech-heading">Import Audio</h2>
 <p className="muted">Offline speech → review transcript → deterministic work cards. WAV PCM16 mono 16000 Hz · 4 MB · 120 seconds maximum.</p>
 <p role="status">{configured?'Local Windows ASR configured. Review every transcript.':'Local ASR unavailable or unconfigured. Text workflow remains available.'}</p>
 <label htmlFor="speech-file">Audio file (WAV)</label><input id="speech-file" type="file" accept=".wav,audio/wav" disabled={busy||Boolean(initial.error)} onChange={e=>{void select(e.target.files?.[0]);e.target.value='';}} />
 {audio && <p>{audio.source.name} · {audio.source.duration.toFixed(2)} seconds · {audio.source.bytes} bytes</p>}
 <div className="actions"><button disabled={!audio||!configured||busy||Boolean(session)||Boolean(initial.error)} onClick={()=>void transcribe()}>Transcribe</button>{busy&&<button onClick={()=>{generation.current++;request.current?.abort();setBusy(false);setError('Transcription cancelled. Previous workspace preserved.');}}>Cancel transcription</button>}</div>
 {pendingAudio&&<div role="alertdialog" aria-label="Replace speech review?"><p>Replace the current speech review? Existing work cards stay intact until you explicitly analyze another confirmed transcript.</p><button onClick={()=>setPendingAudio(null)}>Keep speech review</button><button onClick={()=>replaceAudio(pendingAudio)}>Replace speech review</button></div>}
 {error&&<p role="alert" className="error">{error}</p>}
 {session&&<><h3>Transcript Preview</h3><p>{session.source.name} · {session.recognition.provider} · {session.recognition.modelId} · language {session.recognition.language??'unknown'} · ASR {(session.recognition.inferenceDuration/1000).toFixed(2)}s</p>
 <details><summary>Original ASR transcript</summary><p className="transcript-text">{session.recognition.transcript}</p><p className="muted">Audio ID: {session.source.id}. No word timestamps or confidence were inferred.</p></details>
 <label htmlFor="speech-transcript">Edit Transcript</label><textarea id="speech-transcript" rows={4} maxLength={10000} value={session.transcript} onChange={e=>{onInvalidate();try{persist(editTranscript(session,e.target.value));}catch(err){setError((err as Error).message);}}}/>
 <p>{session.edits.length?'corrected transcript · user-edited':'raw ASR transcript'} · {session.confirmedRevision===session.revision?'Transcript confirmed':'Transcript confirmation required'}</p>
 <div className="actions"><button disabled={!session.transcript.trim()||session.confirmedRevision===session.revision} onClick={()=>{try{persist(confirmTranscript(session));setError('');}catch(e){setError((e as Error).message);}}}>Confirm Transcript</button><button className="primary" disabled={session.confirmedRevision!==session.revision} onClick={()=>{try{onAnalyze(speechProvenance(session));}catch(e){setError((e as Error).message);}}}>Analyze Confirmed Transcript</button></div>
 </>}
 <p className="muted">Existing cards retain their previous confirmed source until you explicitly replace the workspace.</p>
 <p className="muted" role="status">{saveMessage}</p></section>;
}
