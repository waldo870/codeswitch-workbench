import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import type { SpeechResult } from '../../src/contracts/speech.js';
import { classifyP5Difference, createP5Report, deterministicSampleSelection, makeP4GImprovementDraft, P5_LOCAL_ROOT, P5_SAMPLE_SEED, scoreP5Result, validateP5Audio, validateP5Manifest, type P5DatasetManifest, type P5Sample } from '../../src/speech/p5-evaluation.js';
import { wav } from './helpers.js';

const digest=(bytes:Uint8Array)=>`sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const empty=():P5DatasetManifest=>({schemaVersion:1,seed:P5_SAMPLE_SEED,createdAt:'2026-10-29T00:00:00.000Z',samples:[]});
function sample(language:'zh-TW'|'en'='en',index=0):P5Sample{return{sampleId:`sample-${language}-${index}`,datasetId:'mozilla-foundation/common_voice',datasetVersion:'27.0',datasetRevision:'MDC-27.0',locale:language==='zh-TW'?'zh-TW':'en',language,split:'test',sourceId:`cv-${language}-${index}`,license:'CC0-1.0',attribution:'Mozilla Common Voice',originalAudioFile:`${P5_LOCAL_ROOT}/original/${language}-${index}.wav`,originalAudioSha256:`sha256:${String(index+1).padStart(64,'0')}`,audioFile:`${P5_LOCAL_ROOT}/prepared/${language}-${index}.wav`,audioSha256:`sha256:${String(index+101).padStart(64,'0')}`,referenceTranscript:language==='zh-TW'?'不要部署到 production':'Do not deploy to production'};}
function twenty():P5DatasetManifest{return{...empty(),samples:[...Array.from({length:10},(_,i)=>sample('zh-TW',i)),...Array.from({length:10},(_,i)=>sample('en',i))]};}
const runtime={provider:'windows-whisper',modelId:'large-v3',runtime:'existing Windows Python / OpenAI Whisper CPU Worker',device:'cpu'};
function result(s:P5Sample,patch:Partial<SpeechResult>={}):SpeechResult{return{sourceAudioId:s.audioSha256,transcript:'Do not deploy to production',language:s.language,modelId:'large-v3',provider:'windows-whisper',duration:2,inferenceDuration:1200,timing:{modelLoadDurationMs:800,transcriptionDurationMs:350},runtime:{mode:'live',runtime:'windows-python-whisper',device:'cpu'},status:'success',errors:[],...patch};}

it('keeps an empty, unavailable dataset as NOT_RUN with null scores rather than zero accuracy',()=>{
 const manifest=validateP5Manifest(empty()),report=createP5Report({manifest,cases:[],manifestSha256:null,runtime:{provider:null,modelId:null,runtime:null,device:null},generatedAt:'2026-10-29T00:00:00.000Z'});
 expect(report).toMatchObject({status:'NOT_RUN',sampleCounts:{zhTW:0,english:0,total:0},datasetSha256:null});
 expect(report.summary['zh-TW'].cer).toBeNull();expect(report.summary.en.wer).toBeNull();expect(report.summary.en.latencyP50Ms).toBeNull();
});

it('requires a balanced fixed 10+10 manifest and rejects path traversal or malformed hashes',()=>{
 const one={...empty(),samples:[...Array.from({length:10},(_,i)=>sample('zh-TW',i)),...Array.from({length:10},(_,i)=>sample('en',i))]};
 expect(validateP5Manifest(one).samples).toHaveLength(20);
 expect(()=>validateP5Manifest({...one,samples:one.samples.slice(1)})).toThrow(/exactly 10/);
 expect(()=>validateP5Manifest({...one,samples:one.samples.map((s,i)=>i===0?{...s,audioFile:`${P5_LOCAL_ROOT}/../private.wav`}:s)})).toThrow(/metadata|provenance/);
 expect(()=>validateP5Manifest({...one,samples:one.samples.map((s,i)=>i===0?{...s,audioSha256:'bad'}:s)})).toThrow(/metadata|provenance/);
 expect(()=>validateP5Manifest({...one,samples:one.samples.map((s,i)=>i===0?{...s,datasetId:'google/fleurs',datasetRevision:'70bb2e84b976b7e960aa89f1c648e09c59f894dd',locale:'cmn_hans_cn',license:'cc-by-4.0'}:s)})).toThrow(/cannot be labelled as zh-TW/);
 const fleursEnglish={...one,samples:one.samples.map(s=>s.language==='en'?{...s,datasetId:'google/fleurs' as const,datasetVersion:'fleurs',datasetRevision:'70bb2e84b976b7e960aa89f1c648e09c59f894dd',locale:'en_us',license:'cc-by-4.0'}:s)};expect(validateP5Manifest(fleursEnglish).samples).toHaveLength(20);
});

it('selects stable unique source IDs using the fixed seed and refuses undersized pools',()=>{
 const rows=Array.from({length:15},(_,i)=>({sourceId:`source-${i}`}));
 expect(deterministicSampleSelection(rows,10)).toEqual(deterministicSampleSelection([...rows].reverse(),10));
 expect(deterministicSampleSelection(rows,10)).toHaveLength(10);
 expect(()=>deterministicSampleSelection(rows,16)).toThrow(/selection/);
 expect(()=>deterministicSampleSelection([{sourceId:'same'},{sourceId:'same'}],1)).toThrow(/selection/);
});

it('validates local WAV bytes and SHA integrity without accepting paths outside local-only storage',async()=>{
 const base=await mkdtemp(join(tmpdir(),'codeswitch-p5-'));
 try{
  const audio=wav(),s={...sample(),originalAudioFile:`${P5_LOCAL_ROOT}/original/en-0.wav`,originalAudioSha256:digest(audio),audioFile:`${P5_LOCAL_ROOT}/prepared/en-0.wav`,audioSha256:digest(audio)};
  const dir=join(base,P5_LOCAL_ROOT,'prepared'),original=join(base,P5_LOCAL_ROOT,'original');await mkdir(dir,{recursive:true});await mkdir(original,{recursive:true});await writeFile(join(dir,'en-0.wav'),audio);await writeFile(join(original,'en-0.wav'),audio);
  expect(Buffer.from(await validateP5Audio(s,base)).equals(Buffer.from(audio))).toBe(true);
  await expect(validateP5Audio({...s,audioSha256:`sha256:${'0'.repeat(64)}`},base)).rejects.toThrow(/SHA-256/);
  await expect(validateP5Audio({...s,originalAudioSha256:`sha256:${'0'.repeat(64)}`},base)).rejects.toThrow(/Original source audio SHA-256/);
  await expect(validateP5Audio({...s,audioFile:`${P5_LOCAL_ROOT}/../escape.wav`},base)).rejects.toThrow(/inside local-only/);
 }finally{await rm(base,{recursive:true,force:true});}
});

it('scores zh-TW CER and English WER separately under fixed Unicode normalization',()=>{
 const zh=sample('zh-TW'),en=sample('en');
 const zhResult=scoreP5Result(zh,result(zh,{transcript:'不要部署到 production。'}));
 const enResult=scoreP5Result(en,result(en,{transcript:'do not deploy to production!'}));
 expect(zhResult.cer).toEqual({numerator:0,denominator:15,value:0});expect(zhResult.wer).toBeNull();
 expect(enResult.wer).toEqual({numerator:0,denominator:5,value:0});expect(enResult.cer).toBeNull();
});

it('classifies negation, terminology and punctuation differences conservatively',()=>{
 expect(classifyP5Difference('Do not deploy to production','Deploy to production','en')).toContain('negation');
 expect(classifyP5Difference('Review the OAuth2 API','Review the OAuth API','en')).toContain('incorrect_technical_terms');
 expect(classifyP5Difference('Review the payment webhook.','Review the payment webhook','en')).toContain('punctuation');
 expect(classifyP5Difference('檢查 payment webhook','檢查付款','zh-TW')).toContain('language_switching');
 expect(classifyP5Difference('Review payment webhook before lunch','lunch','en')).toContain('missing_words');
 expect(classifyP5Difference('Review payment webhook','', 'en')).toContain('unsupported_transcript');
 expect(classifyP5Difference('Review payment webhook','Review payment webhook','en',31_000)).toContain('performance');
 const candidate=makeP4GImprovementDraft(sample('en'),['negation','missing_words']);
 expect(candidate).toMatchObject({status:'draft',requiresHumanReview:true,verifiedDefect:false,feedbackCategory:'speech_recognition',sourceReferences:{sampleId:'sample-en-0'}});
 expect(candidate?.problemStatement).toContain('not a verified product defect');
 expect(candidate?.suggestedAcceptanceCriteria).toContain('Manually review the cited sample and reference under the dataset license.');
});

it('classifies a timeout as a timeout and emits only an unverified P4G candidate, not a task',()=>{
 const s=sample('en'),failed=result(s,{transcript:'',status:'failed',errors:[{code:'TIMEOUT',message:'Local ASR timed out.'}],inferenceDuration:300_000,timing:undefined});
 const scored=scoreP5Result(s,failed);
 expect(scored.status).toBe('timeout');expect(scored.errorCode).toBe('TIMEOUT');expect(scored.findingDrafts[0]).toMatchObject({status:'draft',requiresHumanReview:true,verifiedDefect:false,categories:['performance']});
 expect(JSON.stringify(scored)).not.toContain('Do not deploy');expect(JSON.stringify(scored)).not.toMatch(/confirmed|execute|deploy task/i);
});

it('reports partial provider attempts separately and keeps timeout latency in percentile denominator',()=>{
 const manifest=twenty(),s=manifest.samples[0]!,timed=scoreP5Result(s,result(s,{transcript:'',status:'failed',errors:[{code:'TIMEOUT',message:'timeout'}],inferenceDuration:90_000,timing:undefined}));
 const report=createP5Report({manifest,cases:[timed],manifestSha256:'sha256:'+'a'.repeat(64),runtime,generatedAt:'2026-10-29T00:00:00.000Z'});
 expect(report.status).toBe('PARTIAL_LIVE_RESULTS');expect(report.summary['zh-TW']).toMatchObject({timedOut:1,notRun:9,latencyP50Ms:90_000});expect(report.summary.en.wer).toBeNull();
});

it('rejects unknown and duplicate evaluation result IDs',()=>{
 const manifest=twenty(),s=manifest.samples[0]!,timed=scoreP5Result(s,result(s));
 expect(()=>createP5Report({manifest,cases:[{...timed,sampleId:'unknown'}],manifestSha256:null,runtime})).toThrow(/unknown or duplicate/);
 expect(()=>createP5Report({manifest,cases:[timed,timed],manifestSha256:null,runtime})).toThrow(/unknown or duplicate/);
});
