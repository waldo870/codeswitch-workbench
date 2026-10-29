import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { SpeechResult } from '../contracts/speech.js';
import { identifyAudio } from './audio.js';
import { createP5Report, P5_LOCAL_ROOT, scoreP5Result, validateP5Audio, validateP5Manifest, type P5CaseResult, type P5Report } from './p5-evaluation.js';
import { whisperConfig, WindowsWhisper } from './windows-whisper.js';

const root=process.cwd(),manifestPath=resolve(root,P5_LOCAL_ROOT,'manifest.json'),jsonPath=resolve(root,'reports/p5-asr-results.json'),mdPath=resolve(root,'reports/p5-asr-results.md');
const hash=(bytes:Uint8Array)=>`sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const p=(n:number|null)=>n===null?'NOT_RUN':`${n.toFixed(2)} ms`;
function metric(m:P5Report['summary']['en']['wer']):string{return m?`${m.numerator}/${m.denominator} (${m.value===null?'n/a':`${(m.value*100).toFixed(2)}%`})`:'NOT_RUN';}
export function renderP5Markdown(r:P5Report):string{
 const rows=(['zh-TW','en'] as const).map(lang=>{const s=r.summary[lang];return `| ${lang} | ${s.completed} | ${s.failed} | ${s.timedOut} | ${s.notRun} | ${lang==='zh-TW'?metric(s.cer):'—'} | ${lang==='en'?metric(s.wer):'—'} | ${p(s.latencyP50Ms)} / ${p(s.latencyP95Ms)} | ${p(s.modelLoadP50Ms)} / ${p(s.modelLoadP95Ms)} |`;}).join('\n');
 const datasets=(['zh-TW','en'] as const).map(lang=>`${lang}: ${r.datasetsByLanguage[lang].map(d=>`${d.datasetVersion} (${d.datasetRevision}; ${d.locale}; ${d.split})`).join(', ')||'NOT_SELECTED'}`).join('\n');
 const errors=r.cases.filter(c=>c.status!=='completed').map(c=>`- ${c.sampleId}: ${c.status}${c.errorCode?` (${c.errorCode})`:''}`).join('\n')||'- None recorded.';
 return `# P5 ASR Evaluation\n\n- Status: **${r.status}**\n- Generated: ${r.generatedAt}\n- Dataset version: ${r.datasetVersion}\n- Dataset revision: ${r.datasetRevision??'Multiple per-language revisions; see below'}\n- Dataset SHA-256: ${r.datasetSha256??'NOT_AVAILABLE'}\n- Sample manifest SHA-256: ${r.manifestSha256??'NOT_AVAILABLE'}\n- Sampling seed: ${r.seed}\n- Provider / model: ${r.runtime.provider??'NOT_RUN'} / ${r.runtime.modelId??'NOT_RUN'}\n- Runtime / device: ${r.runtime.runtime??'NOT_RUN'} / ${r.runtime.device??'NOT_RUN'}\n- Samples: zh-TW ${r.sampleCounts.zhTW}, English ${r.sampleCounts.english}, total ${r.sampleCounts.total}\n\n## Dataset revisions by language\n\n${datasets}\n\n## Results by language\n\n| Language | Complete | Failed | Timeout | Not run | CER | WER | Total latency P50 / P95 | Model load P50 / P95 |\n| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |\n${rows}\n\nPunctuation is removed under the fixed scoring normalization. zh-TW is scored with Unicode NFC character error rate; English is scored with NFC/NFKC lowercase whitespace-token word error rate. Per-language metrics remain separate. No scores are filled for absent or unrun samples. The report stores sample IDs and hashes, not reference transcripts, hypotheses, audio or personal metadata.\n\n## Failed or incomplete cases\n\n${errors}\n\n## Improvement review candidates\n\n${r.cases.reduce((n,c)=>n+c.findingDrafts.length,0)} deterministic draft candidate(s); each is marked unverified and requires human review. No proposal is auto-approved or sent to P4G storage/GitHub.\n\n## Limitations\n\n${r.limitations.map(x=>`- ${x}`).join('\n')||'- None recorded.'}\n`;
}

async function run():Promise<P5Report>{
 let bytes:Buffer|undefined,manifest;
 try{bytes=await readFile(manifestPath);manifest=validateP5Manifest(JSON.parse(bytes.toString('utf8')));}
 catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;manifest=validateP5Manifest({schemaVersion:1,seed:'codeswitch-p5-small-2026-01',createdAt:new Date().toISOString(),samples:[]});}
 const manifestSha=bytes?hash(bytes):null,cases:P5CaseResult[]=[];
 let cfg:ReturnType<typeof whisperConfig>=null;
 const limitations:string[]=[];
 if(!manifest.samples.length){limitations.push('No local sample manifest is present; no audio is evaluated.');}
 try{cfg=whisperConfig();}catch{limitations.push('Existing Windows Whisper configuration is invalid or its local model is unavailable; no model download or replacement was attempted.');}
 if(!cfg)limitations.push('Windows Whisper is not configured in this execution environment. Set CODESWITCH_ASR_PYTHON and CODESWITCH_ASR_MODEL_FILE to the already-installed Windows Python and Whisper checkpoint before running the smoke test; no model download is performed.');
 for(const sample of manifest.samples){
   let audio:Uint8Array,source:Awaited<ReturnType<typeof identifyAudio>>;
   try{
     audio=await validateP5Audio(sample,root);source=await identifyAudio(audio,basename(sample.audioFile));
     if(source.id!==sample.audioSha256)throw new Error('Audio identity mismatch.');
   }catch{
     cases.push({sampleId:sample.sampleId,language:sample.language,sourceId:sample.sourceId,audioSha256:sample.audioSha256,status:'not_run',errorCode:'LOCAL_AUDIO_VALIDATION_FAILED',referenceTranscript:null,hypothesis:null,cer:null,wer:null,modelLoadMs:null,inferenceMs:null,totalLatencyMs:null,findingDrafts:[]});
     continue;
   }
   if(!cfg){cases.push({sampleId:sample.sampleId,language:sample.language,sourceId:sample.sourceId,audioSha256:sample.audioSha256,status:'not_run',errorCode:'WINDOWS_ASR_NOT_CONFIGURED',referenceTranscript:null,hypothesis:null,cer:null,wer:null,modelLoadMs:null,inferenceMs:null,totalLatencyMs:null,findingDrafts:[]});continue;}
   try{
     const result:SpeechResult=await new WindowsWhisper(cfg).transcribe(audio,source);
     cases.push(scoreP5Result(sample,result));
   }catch{cases.push({sampleId:sample.sampleId,language:sample.language,sourceId:sample.sourceId,audioSha256:sample.audioSha256,status:'failed',errorCode:'LOCAL_ASR_PROVIDER_FAILED',referenceTranscript:null,hypothesis:null,cer:null,wer:null,modelLoadMs:null,inferenceMs:null,totalLatencyMs:null,findingDrafts:[]});}
 }
 const modelId=cfg?basename(cfg.modelFile).replace(/\.pt$/i,''):null;
 return createP5Report({manifest,cases,manifestSha256:manifestSha,runtime:{provider:cfg?'windows-whisper':null,modelId,runtime:cfg?'existing Windows Python / OpenAI Whisper CPU Worker':null,device:cfg?'cpu':null},limitations,generatedAt:new Date().toISOString()});
}

async function main(){const report=await run();await mkdir(resolve(root,'reports'),{recursive:true});await writeFile(jsonPath,JSON.stringify(report,null,2)+'\n',{mode:0o600});await writeFile(mdPath,renderP5Markdown(report),{mode:0o600});console.log(`P5 ASR evaluation: ${report.status}; ${report.sampleCounts.total} samples; reports written (no audio/transcripts included).`);for(const limitation of report.limitations)console.log(`- ${limitation}`);}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href)main().catch(error=>{console.error(error instanceof Error?error.message:'P5 evaluation failed.');process.exitCode=1;});
