import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { SpeechResult } from '../contracts/speech.js';
import { identifyAudio, SpeechError } from './audio.js';

export const P5_SAMPLE_SEED = 'codeswitch-p5-small-2026-01';
export const P5_LOCAL_ROOT = 'local-only/p5-speech';
export type P5Language = 'zh-TW' | 'en';
export interface P5Sample {
  sampleId: string; datasetId: 'mozilla-foundation/common_voice' | 'google/fleurs'; datasetVersion: string;
  datasetRevision: string; locale: string; language: P5Language; split: string; sourceId: string;
  license: string; attribution: string; originalAudioFile: string; originalAudioSha256: string; audioFile: string; audioSha256: string;
  referenceTranscript: string;
}
export interface P5DatasetManifest { schemaVersion: 1; seed: string; createdAt: string; samples: P5Sample[] }
export type P5FailureCategory = 'missing_words' | 'incorrect_technical_terms' | 'punctuation' | 'negation' | 'language_switching' | 'unsupported_transcript' | 'performance';
export interface P5FindingDraft {
  status: 'draft'; requiresHumanReview: true; verifiedDefect: false; feedbackCategory: 'speech_recognition';
  categories: P5FailureCategory[]; title: string; problemStatement: string; suggestedAcceptanceCriteria: string[];
  sourceReferences: { datasetId: string; datasetVersion: string; sampleId: string; sourceId: string; audioSha256: string };
}
export interface P5CaseResult {
  sampleId: string; language: P5Language; sourceId: string; audioSha256: string;
  status: 'completed' | 'failed' | 'timeout' | 'not_run'; errorCode: string | null; referenceTranscript: string | null;
  hypothesis: string | null; cer: { numerator: number; denominator: number; value: number | null } | null;
  wer: { numerator: number; denominator: number; value: number | null } | null;
  modelLoadMs: number | null; inferenceMs: number | null; totalLatencyMs: number | null; findingDrafts: P5FindingDraft[];
}
export interface P5Report {
  schemaVersion: 1; status: 'LIVE_RESULTS' | 'PARTIAL_LIVE_RESULTS' | 'NOT_RUN'; generatedAt: string; datasetVersion: string;
  datasetRevision: string | null; datasetSha256: string | null; manifestSha256: string | null; seed: string; runtime: { provider: string | null; modelId: string | null; runtime: string | null; device: string | null };
  sampleCounts: { zhTW: number; english: number; total: number }; summary: Record<P5Language, { completed: number; failed: number; timedOut: number; notRun: number; cer: P5CaseResult['cer']; wer: P5CaseResult['wer']; latencyP50Ms: number | null; latencyP95Ms: number | null; modelLoadP50Ms: number | null; modelLoadP95Ms: number | null; inferenceP50Ms: number | null; inferenceP95Ms: number | null }>;
  cases: P5CaseResult[]; limitations: string[];
}

function validHash(value: unknown): value is string { return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/.test(value); }
function exact(value: object, keys: string[]): boolean { return Object.keys(value).every(k => keys.includes(k)) && keys.every(k => Object.hasOwn(value, k)); }
export function validateP5Manifest(value: unknown): P5DatasetManifest {
  if (!value || typeof value !== 'object') throw new Error('Invalid P5 dataset manifest.');
  const m = value as P5DatasetManifest;
  if (!exact(m, ['schemaVersion','seed','createdAt','samples']) || m.schemaVersion !== 1 || typeof m.seed !== 'string' || !m.seed || typeof m.createdAt !== 'string' || !Number.isFinite(Date.parse(m.createdAt)) || !Array.isArray(m.samples) || m.samples.length > 20 || new Set(m.samples.map(s => s?.sampleId)).size !== m.samples.length) throw new Error('Invalid P5 dataset manifest schema or sample count.');
  for (const s of m.samples) {
    if (!s || !exact(s, ['sampleId','datasetId','datasetVersion','datasetRevision','locale','language','split','sourceId','license','attribution','originalAudioFile','originalAudioSha256','audioFile','audioSha256','referenceTranscript']) || !/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(s.sampleId) || !['mozilla-foundation/common_voice','google/fleurs'].includes(s.datasetId) || !s.datasetVersion || !s.datasetRevision || !s.locale || !['zh-TW','en'].includes(s.language) || !s.split || !s.sourceId || !s.license || !s.attribution || !validHash(s.originalAudioSha256) || !validHash(s.audioSha256) || typeof s.originalAudioFile!=='string' || isAbsolute(s.originalAudioFile) || !s.originalAudioFile.startsWith(`${P5_LOCAL_ROOT}/`) || s.originalAudioFile.split(/[\\/]/).includes('..') || typeof s.audioFile !== 'string' || isAbsolute(s.audioFile) || !s.audioFile.startsWith(`${P5_LOCAL_ROOT}/`) || s.audioFile.split(/[\\/]/).includes('..') || typeof s.referenceTranscript !== 'string' || !s.referenceTranscript.trim() || s.referenceTranscript.length > 10_000) throw new Error('Invalid P5 sample metadata or provenance.');
    if(s.datasetId==='mozilla-foundation/common_voice'&&(s.license!=='CC0-1.0'||s.language==='zh-TW'&&s.locale!=='zh-TW'||s.language==='en'&&!/^en(?:[-_].*)?$/i.test(s.locale)))throw new Error('Common Voice locale/license does not match the approved P5 source register.');
    if(s.datasetId==='google/fleurs'&&(s.license!=='cc-by-4.0'||s.language!=='en'||s.locale!=='en_us'||!/^[0-9a-f]{40}$/i.test(s.datasetRevision)))throw new Error('FLEURS is accepted only for the pinned English config; it cannot be labelled as zh-TW.');
  }
  const zh = m.samples.filter(s => s.language === 'zh-TW').length, en = m.samples.filter(s => s.language === 'en').length;
  if (m.samples.length && (zh !== 10 || en !== 10)) throw new Error('A live P5 batch must contain exactly 10 zh-TW and 10 English samples.');
  return structuredClone(m);
}

export function deterministicSampleSelection<T extends { sourceId: string }>(rows: T[], count: number, seed = P5_SAMPLE_SEED): T[] {
  if (!Number.isInteger(count) || count < 0 || rows.length<count || new Set(rows.map(r => r.sourceId)).size !== rows.length) throw new Error('Invalid deterministic selection input.');
  return [...rows].sort((a,b) => createHash('sha256').update(`${seed}:${a.sourceId}`).digest('hex').localeCompare(createHash('sha256').update(`${seed}:${b.sourceId}`).digest('hex'))).slice(0,count);
}

export async function validateP5Audio(sample: P5Sample, repoRoot: string): Promise<Uint8Array> {
  const lexicalRoot=resolve(repoRoot,P5_LOCAL_ROOT),contained=async(relativePath:string)=>{
    const candidate=resolve(repoRoot,relativePath),lexicalRel=relative(lexicalRoot,candidate);
    if(!lexicalRel||lexicalRel.startsWith(`..${sep}`)||lexicalRel==='..'||isAbsolute(lexicalRel))throw new SpeechError('FORMAT','Audio file must be inside local-only/p5-speech.');
    const root=await realpath(lexicalRoot),path=await realpath(candidate),rel=relative(root,path);
    if(!rel||rel.startsWith(`..${sep}`)||rel==='..'||isAbsolute(rel))throw new SpeechError('FORMAT','Audio file must be inside local-only/p5-speech.');
    return path;
  };
  const originalPath=await contained(sample.originalAudioFile),path=await contained(sample.audioFile),originalBytes=await readFile(originalPath),bytes=await readFile(path);
  if(`sha256:${createHash('sha256').update(originalBytes).digest('hex')}`!==sample.originalAudioSha256)throw new SpeechError('CORRUPTED_AUDIO','Original source audio SHA-256 does not match the manifest.');
  const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  if (digest !== sample.audioSha256) throw new SpeechError('CORRUPTED_AUDIO','Prepared audio SHA-256 does not match the manifest.');
  const identified = await identifyAudio(bytes, path);
  if (identified.id !== digest) throw new SpeechError('CORRUPTED_AUDIO','Prepared WAV identity does not match its content.');
  return bytes;
}

function normalized(text: string, language: P5Language): string {
  const nfc = text.normalize('NFC');
  return language === 'zh-TW'
    ? nfc.replace(/[\p{P}\p{S}\s]/gu, '')
    : nfc.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\p{P}\p{S}]/gu, ' ').trim().replace(/\s+/g, ' ');
}
function distance(a: string[], b: string[]): number {
  let row = Array.from({length:b.length+1},(_,i)=>i);
  for (let i=0;i<a.length;i++) { const next=[i+1]; for (let j=0;j<b.length;j++) next.push(Math.min(next[j]!+1,row[j+1]!+1,row[j]!+(a[i]===b[j]?0:1))); row=next; }
  return row[b.length]!;
}
function metric(n: number, d: number) { return { numerator:n, denominator:d, value:d?n/d:null }; }
function percentile(values: number[], p: number): number | null { if (!values.length) return null; const s=[...values].sort((a,b)=>a-b); return s[Math.max(0,Math.ceil(p*s.length)-1)]!; }
function aggregate(values: {numerator:number;denominator:number}[]) { const n=values.reduce((a,v)=>a+v.numerator,0),d=values.reduce((a,v)=>a+v.denominator,0); return d?metric(n,d):null; }

const NEGATION = /\b(?:don't|do not|cannot|can't|never|not|no)\b|不要|不能|不得|不可以|尚未/iu;
export function classifyP5Difference(reference: string, hypothesis: string, language: P5Language, latencyMs: number | null = null): P5FailureCategory[] {
  const categories = new Set<P5FailureCategory>();
  const refNorm=normalized(reference,language), hypNorm=normalized(hypothesis,language);
  if (refNorm === hypNorm && reference !== hypothesis) categories.add('punctuation');
  if (NEGATION.test(reference) && !NEGATION.test(hypothesis)) categories.add('negation');
  if (reference.trim() && !hypothesis.trim()) categories.add('unsupported_transcript');
  const referenceMixed=/[\u3400-\u9fff]/u.test(reference)&&/[A-Za-z]/u.test(reference),hypothesisMixed=/[\u3400-\u9fff]/u.test(hypothesis)&&/[A-Za-z]/u.test(hypothesis);
  if (referenceMixed && !hypothesisMixed) categories.add('language_switching');
  const refTokens=language==='zh-TW'?[...refNorm]:refNorm.split(/\s+/).filter(Boolean), hypTokens=language==='zh-TW'?[...hypNorm]:hypNorm.split(/\s+/).filter(Boolean);
  const edits=distance(refTokens,hypTokens),scale=Math.max(refTokens.length,hypTokens.length,1);
  if (hypNorm && edits/scale>=0.8) categories.add('unsupported_transcript');
  if (edits>0 && !categories.has('punctuation')) categories.add('missing_words');
  if (/[A-Za-z][A-Za-z0-9+.#_-]{1,}/.test(reference) && /[A-Za-z][A-Za-z0-9+.#_-]{1,}/.test(hypothesis) && distance(reference.match(/[A-Za-z][A-Za-z0-9+.#_-]*/g)??[],hypothesis.match(/[A-Za-z][A-Za-z0-9+.#_-]*/g)??[])>0) categories.add('incorrect_technical_terms');
  if (latencyMs !== null && latencyMs > 30_000) categories.add('performance');
  return [...categories];
}
export function makeP4GImprovementDraft(sample: P5Sample, categories: P5FailureCategory[]): P5FindingDraft | null {
  if (!categories.length) return null;
  const labels: Record<P5FailureCategory,string>={missing_words:'missing words',incorrect_technical_terms:'technical terminology',punctuation:'punctuation',negation:'negation preservation',language_switching:'language switching',unsupported_transcript:'unsupported transcript',performance:'ASR performance'};
  const category=categories[0]!;
  return {status:'draft',requiresHumanReview:true,verifiedDefect:false,feedbackCategory:'speech_recognition',categories:[...categories],title:`Review ${labels[category]} in ASR evaluation`,problemStatement:'A fixed public evaluation sample differed from its reference. This is a benchmark observation, not a verified product defect; inspect the sample, dataset conditions, and ASR output before deciding whether to create a product feedback record.',suggestedAcceptanceCriteria:['Manually review the cited sample and reference under the dataset license.','Check whether preprocessing, transcript normalization, or domain mismatch explains the difference.','If the issue is reproducible in authorized product data, add a reviewed P4G feedback record and regression test.'],sourceReferences:{datasetId:sample.datasetId,datasetVersion:sample.datasetVersion,sampleId:sample.sampleId,sourceId:sample.sourceId,audioSha256:sample.audioSha256}};
}

export function createP5Report(args: {manifest:P5DatasetManifest;cases:P5CaseResult[];manifestSha256:string|null;runtime:P5Report['runtime'];generatedAt?:string;limitations?:string[]}): P5Report {
  const manifest=validateP5Manifest(args.manifest), ids=new Set(manifest.samples.map(s=>s.sampleId));
  if(args.cases.some(c=>!ids.has(c.sampleId))||new Set(args.cases.map(c=>c.sampleId)).size!==args.cases.length)throw new Error('P5 result references an unknown or duplicate sample.');
  const cases=manifest.samples.map(sample=>args.cases.find(c=>c.sampleId===sample.sampleId)??({sampleId:sample.sampleId,language:sample.language,sourceId:sample.sourceId,audioSha256:sample.audioSha256,status:'not_run',errorCode:null,referenceTranscript:null,hypothesis:null,cer:null,wer:null,modelLoadMs:null,inferenceMs:null,totalLatencyMs:null,findingDrafts:[]} satisfies P5CaseResult));
  const summary={} as P5Report['summary'];
  for(const language of ['zh-TW','en'] as const){
    const selected=cases.filter(c=>c.language===language),completed=selected.filter(c=>c.status==='completed'),valid=(key:'cer'|'wer')=>aggregate(completed.map(c=>c[key]).filter((v):v is NonNullable<typeof v>=>v!==null));
    const lat=(key:'totalLatencyMs'|'modelLoadMs'|'inferenceMs')=>{const source=key==='totalLatencyMs'?selected.filter(c=>c.status!=='not_run'):completed;const xs=source.map(c=>c[key]).filter((v):v is number=>v!==null);return{p50:percentile(xs,.5),p95:percentile(xs,.95)};};
    const l=lat('totalLatencyMs'),m=lat('modelLoadMs'),i=lat('inferenceMs');
    summary[language]={completed:completed.length,failed:selected.filter(c=>c.status==='failed').length,timedOut:selected.filter(c=>c.status==='timeout').length,notRun:selected.filter(c=>c.status==='not_run').length,cer:language==='zh-TW'?valid('cer'):null,wer:language==='en'?valid('wer'):null,latencyP50Ms:l.p50,latencyP95Ms:l.p95,modelLoadP50Ms:m.p50,modelLoadP95Ms:m.p95,inferenceP50Ms:i.p50,inferenceP95Ms:i.p95};
  }
  const attempted=cases.filter(c=>c.status!=='not_run').length;
  return {schemaVersion:1,status:!attempted?'NOT_RUN':attempted<manifest.samples.length?'PARTIAL_LIVE_RESULTS':'LIVE_RESULTS',generatedAt:args.generatedAt??new Date().toISOString(),datasetVersion:manifest.samples[0]?.datasetVersion??'Common Voice Scripted Speech 27.0 (planned; no local sample manifest)',datasetRevision:manifest.samples[0]?.datasetRevision??null,datasetSha256:null,manifestSha256:args.manifestSha256,seed:manifest.seed,runtime:args.runtime,sampleCounts:{zhTW:manifest.samples.filter(s=>s.language==='zh-TW').length,english:manifest.samples.filter(s=>s.language==='en').length,total:manifest.samples.length},summary,cases,limitations:args.limitations??[]};
}

export function scoreP5Result(sample:P5Sample,result:SpeechResult):P5CaseResult {
  if(result.sourceAudioId!==sample.audioSha256||result.status!=='success'||result.provider!=='windows-whisper'||!result.transcript.trim()){
    const errorCode=result.errors[0]?.code??(result.provider!=='windows-whisper'?'PROVIDER_MISMATCH':'EMPTY_OR_FAILED_TRANSCRIPT');
    const failureCategories:P5FailureCategory[]=errorCode==='TIMEOUT'?['performance']:['EMPTY_TRANSCRIPT','EMPTY_OR_FAILED_TRANSCRIPT'].includes(errorCode)?['unsupported_transcript']:[];
    const finding=makeP4GImprovementDraft(sample,failureCategories);
    return{sampleId:sample.sampleId,language:sample.language,sourceId:sample.sourceId,audioSha256:sample.audioSha256,status:errorCode==='TIMEOUT'?'timeout':'failed',errorCode,referenceTranscript:null,hypothesis:null,cer:null,wer:null,modelLoadMs:null,inferenceMs:null,totalLatencyMs:Number.isFinite(result.inferenceDuration)?result.inferenceDuration:null,findingDrafts:finding?[finding]:[]};
  }
  const ref=normalized(sample.referenceTranscript,sample.language),hyp=normalized(result.transcript,sample.language),refs=sample.language==='zh-TW'?[...ref]:ref.split(/\s+/).filter(Boolean),hyps=sample.language==='zh-TW'?[...hyp]:hyp.split(/\s+/).filter(Boolean),edits=distance(refs,hyps);
  const cer=sample.language==='zh-TW'?metric(edits,refs.length):null,wer=sample.language==='en'?metric(edits,refs.length):null;
  const categories=classifyP5Difference(sample.referenceTranscript,result.transcript,sample.language,result.inferenceDuration);
  return {sampleId:sample.sampleId,language:sample.language,sourceId:sample.sourceId,audioSha256:sample.audioSha256,status:'completed',errorCode:null,referenceTranscript:null,hypothesis:null,cer,wer,modelLoadMs:result.timing?.modelLoadDurationMs??null,inferenceMs:result.timing?.transcriptionDurationMs??null,totalLatencyMs:result.inferenceDuration,findingDrafts:makeP4GImprovementDraft(sample,categories)?[makeP4GImprovementDraft(sample,categories)!]:[]};
}
