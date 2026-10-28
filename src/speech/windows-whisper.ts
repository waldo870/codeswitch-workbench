import { spawn, execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { mkdir,mkdtemp,writeFile,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AudioSource, SpeechProvider, SpeechProviderResult, SpeechResult } from '../contracts/speech.js';
import { SpeechError, identifyAudio } from './audio.js';
export const ASR_TIMEOUT_MS=300_000;
export interface WhisperConfig { python: string; modelFile: string }
export function whisperConfig(env: NodeJS.ProcessEnv=process.env): WhisperConfig | null {
 if(!env.CODESWITCH_ASR_PYTHON && !env.CODESWITCH_ASR_MODEL_FILE)return null;
 const python=env.CODESWITCH_ASR_PYTHON??'',modelFile=env.CODESWITCH_ASR_MODEL_FILE??'';
 if(!/^\/mnt\/[a-z]\/.+\/python\.exe$/i.test(python) || !existsSync(python) || !/^[a-z]:\\[^\r\n]+\.pt$/i.test(modelFile))throw new SpeechError('UNAVAILABLE','Configure an existing Windows Python and local .pt model file.');
 const local=execFileSync('wslpath',['-u',modelFile],{encoding:'utf8',timeout:2000}).trim();
 if(!existsSync(local))throw new SpeechError('MISSING_MODEL','Configured local model file is missing; no download is performed.');
 return {python,modelFile};
}
export type WorkerRun=(config:WhisperConfig, bytes:Uint8Array, signal?:AbortSignal)=>Promise<string>;
export const runWhisperWorker:WorkerRun=async(config,bytes,signal)=>{
 const root=fileURLToPath(new URL('../../.speech-local/',import.meta.url));await mkdir(root,{recursive:true,mode:0o700});
 const directory=await mkdtemp(join(root,'request-'));
 const audioFile=join(directory,'audio.wav');
 try {
 await writeFile(audioFile,bytes,{mode:0o600});
 const audioPath=execFileSync('wslpath',['-w',audioFile],{encoding:'utf8',timeout:2000}).trim();
 const script=execFileSync('wslpath',['-w',fileURLToPath(new URL('./windows-whisper-worker.py',import.meta.url))],{encoding:'utf8',timeout:2000}).trim();
 return await new Promise<string>((resolve,reject)=>{
  if(signal?.aborted){reject(new SpeechError('CANCELLED','Transcription cancelled.'));return;}
  const child=spawn(config.python,['-u',script,config.modelFile,audioPath],{shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
  const output:Buffer[]=[];let size=0,settled=false,failure:Error|null=null;
  let kill:ReturnType<typeof setTimeout>|undefined,grace:ReturnType<typeof setTimeout>|undefined;
  const finish=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(timer);clearTimeout(kill);clearTimeout(grace);signal?.removeEventListener('abort',cancel);if(error)reject(error);else resolve(Buffer.concat(output).toString('utf8'));};
  const stop=(error:Error)=>{if(settled||failure)return;failure=error;try{writeFileSync(join(directory,'cancel'),'1',{mode:0o600});}catch{ /* scoped termination below remains available */ }
   kill=setTimeout(()=>child.kill('SIGTERM'),1000);kill.unref();grace=setTimeout(()=>finish(error),2500);grace.unref();
  };
  const cancel=()=>stop(new SpeechError('CANCELLED','Transcription cancelled.'));
  const timer=setTimeout(()=>stop(new SpeechError('TIMEOUT','Local ASR timed out.')),ASR_TIMEOUT_MS);
  signal?.addEventListener('abort',cancel,{once:true});
  child.stdout.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>100_000)stop(new SpeechError('MALFORMED_RESPONSE','ASR response exceeds limit.'));else output.push(chunk);});
  child.stderr.on('data',()=>{});child.stdin.on('error',()=>{});
  child.on('error',()=>finish(new SpeechError('UNAVAILABLE','Windows ASR worker could not start.')));
  child.on('close',code=>failure?finish(failure):code===0?finish():finish(new SpeechError(code===20?'MISSING_MODEL':code===124?'TIMEOUT':code===125?'CANCELLED':'PROVIDER_ERROR','Local ASR worker failed. No audio or provider diagnostics were logged.')));
  // Closing stdin is necessary for Windows/WSL interop. Cancellation uses a
  // marker in this request's private directory, never audio/commands on stdin.
  child.stdin.end();
 });
 } finally {try{await rm(directory,{recursive:true,force:true});}catch{throw new SpeechError('PROVIDER_ERROR','Temporary audio cleanup failed. Inspect the private local audio directory.');}}
};
export class WindowsWhisper implements SpeechProvider {
 constructor(private config:WhisperConfig,private run:WorkerRun=runWhisperWorker){}
 readonly providerId='windows-whisper';
 get modelId(){return this.config.modelFile.split(/[\\/]/).at(-1)!.replace(/\.pt$/i,'');}
 get executionMode(){return this.run===runWhisperWorker?'live':'mock';}
 async transcribe(bytes:Uint8Array,source:AudioSource,signal?:AbortSignal):Promise<SpeechProviderResult>{
  const start=performance.now(),modelId=this.config.modelFile.split(/[\\/]/).at(-1)!.replace(/\.pt$/i,'');
  const base={sourceAudioId:source.id,language:null,modelId,provider:'windows-whisper',duration:source.duration,audioFormat:{container:'wav' as const,encoding:'pcm_s16le' as const,sampleRateHz:16000 as const,channels:1 as const,bitsPerSample:16 as const},runtime:{mode:(this.run===runWhisperWorker?'live':'mock') as 'live'|'mock',runtime:'windows-python-whisper',device:'cpu' as const}};
  try{
   const identified=await identifyAudio(bytes,source.name);if(identified.id!==source.id || identified.duration!==source.duration)throw new SpeechError('CORRUPTED_AUDIO','Audio identity changed.');
   const text=await this.run(this.config,bytes,signal);let r:Record<string,unknown>;
   try{r=JSON.parse(text);}catch{throw new SpeechError('MALFORMED_RESPONSE','ASR returned invalid JSON.');}
   if(r.sourceAudioId!==source.id || r.model!==modelId || r.provider!=='windows-whisper' || r.device!=='cpu' || typeof r.text!=='string' || r.text.length>10000 || !(r.language===null || typeof r.language==='string' && r.language.length<50))throw new SpeechError('MALFORMED_RESPONSE','ASR response schema or model identity mismatch.');
   if(!r.text.trim())throw new SpeechError('EMPTY_TRANSCRIPT','No speech transcript was returned.');
   return {...base,transcript:r.text,language:r.language as string|null,inferenceDuration:performance.now()-start,status:'success',errors:[]};
  }catch(e){const error=e instanceof SpeechError?e:new SpeechError('PROVIDER_ERROR','Local ASR failed.');return {...base,transcript:'',inferenceDuration:performance.now()-start,status:error.code==='CANCELLED'?'cancelled':'failed',errors:[{code:error.code,message:error.message}]};}
 }
}
