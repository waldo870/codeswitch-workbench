import { expect, it } from 'vitest';
import { createSpeechBenchmarkReport, type SpeechBenchmarkCase, type SpeechBenchmarkProviderRun } from '../../src/speech/evaluation.js';

const cases:SpeechBenchmarkCase[]=[
  {id:'human-zh-en-01',audioSha256:'sha256:'+'1'.repeat(64),referenceTranscript:'請 review webhook and do not deploy',codeSwitchTerms:['review','webhook','deploy'],expectedConstraintTuples:['prohibited:deploy/production'],expectedProhibitedConstraints:1,expectedCardCount:2},
  {id:'human-en-02',audioSha256:'sha256:'+'2'.repeat(64),referenceTranscript:'check sandbox credentials',codeSwitchTerms:['sandbox credentials'],expectedConstraintTuples:[],expectedProhibitedConstraints:0,expectedCardCount:1}
];
const provenance=(executionMode:'live'|'mock'='live')=>({providerId:executionMode==='live'?'whisper-win':'hailo-10h',modelId:executionMode==='live'?'large-v3':'whisper-base',executionMode,runtime:executionMode==='live'?'windows-python-whisper':'hailo-worker-v1',hardware:{device:executionMode==='live'?'cpu' as const:'unknown' as const,modelVariant:executionMode==='live'?'large-v3':'base'}});
const result=(caseId:string,audioSha256:string,transcript:string|null,status:'completed'|'failed'|'timeout'|'not_run'='completed',latencyMs:number|null=10)=>({caseId,audioSha256,transcript,status,latencyMs,expectedConstraints:caseId.endsWith('01')?1:0,preservedConstraints:caseId.endsWith('01')?1:0,expectedProhibitedConstraints:caseId.endsWith('01')?1:0,preservedProhibitedConstraints:caseId.endsWith('01')?1:0,rawWorkflowSuccess:status==='completed'?true:null,reviewedWorkflowSuccess:status==='completed'?true:null});

it('aggregates ASR, constraints, workflow and nearest-rank latency metrics per live provider',()=>{
  const run:SpeechBenchmarkProviderRun={provenance:provenance(),cases:[result(cases[0]!.id,cases[0]!.audioSha256,cases[0]!.referenceTranscript,'completed',10),result(cases[1]!.id,cases[1]!.audioSha256,cases[1]!.referenceTranscript,'completed',40)]};
  const report=createSpeechBenchmarkReport('human-voice-v1',cases,[run],'2026-10-28T00:00:00.000Z').providers[0]!;
  const chars=cases.reduce((n,c)=>n+[...c.referenceTranscript].length,0),words=cases.reduce((n,c)=>n+c.referenceTranscript.trim().split(/\s+/).length,0);
  expect(report.status).toBe('LIVE_RESULTS');expect(report.cer).toMatchObject({numerator:0,denominator:chars,value:0});expect(report.wer).toMatchObject({numerator:0,denominator:words,value:0});expect(report.codeSwitchTermAccuracy).toMatchObject({numerator:4,denominator:4,value:1});expect(report.negationPreservation).toMatchObject({numerator:1,denominator:1,value:1});expect(report.rawWorkflowSuccess).toMatchObject({numerator:2,denominator:2});expect(report.reviewedWorkflowSuccess).toMatchObject({numerator:2,denominator:2});expect(report.latencyP50Ms).toBe(10);expect(report.latencyP95Ms).toBe(40);
});

it('records timeout and missing results without treating them as semantic errors or zero scores',()=>{
  const run:SpeechBenchmarkProviderRun={provenance:provenance(),cases:[result(cases[0]!.id,cases[0]!.audioSha256,null,'timeout',null)]};
  const report=createSpeechBenchmarkReport('human-voice-v1',cases,[run],'2026-10-28T00:00:00.000Z').providers[0]!;
  expect(report).toMatchObject({status:'LIVE_RESULTS',attempted:1,completed:0,failed:0,timedOut:1,notRun:1,cer:{numerator:0,denominator:0,value:null},latencyP50Ms:null});
});

it('keeps Mock results visible but never scores or counts them as Live evaluation',()=>{
  const run:SpeechBenchmarkProviderRun={provenance:provenance('mock'),cases:[result(cases[0]!.id,cases[0]!.audioSha256,'exactly the gold','completed',0)]};
  const report=createSpeechBenchmarkReport('human-voice-v1',cases,[run],'2026-10-28T00:00:00.000Z').providers[0]!;
  expect(report.status).toBe('MOCK_ONLY');expect(report.attempted).toBe(0);expect(report.completed).toBe(0);expect(report.cer).toBeNull();expect(report.caseResults[0]?.transcript).toBe('exactly the gold');
});

it('refuses dataset hash mismatches, denominator drift, duplicate cases and duplicate provider runs',()=>{
  const run:SpeechBenchmarkProviderRun={provenance:provenance(),cases:[result(cases[0]!.id,cases[0]!.audioSha256,cases[0]!.referenceTranscript)]};
  const badHash=structuredClone(run);badHash.cases[0]!.audioSha256='sha256:'+'0'.repeat(64);expect(()=>createSpeechBenchmarkReport('human-v1',cases,[badHash])).toThrow('Invalid benchmark result');
  const drift=structuredClone(run);drift.cases[0]!.expectedConstraints=9;expect(()=>createSpeechBenchmarkReport('human-v1',cases,[drift])).toThrow('Gold-label denominator');
  expect(()=>createSpeechBenchmarkReport('human-v1',[cases[0]!,cases[0]!],[])).toThrow('dataset contract');
  const valid:SpeechBenchmarkProviderRun={provenance:provenance(),cases:[]};expect(()=>createSpeechBenchmarkReport('human-v1',cases,[valid,valid])).toThrow('unique provider IDs');
});

it('does not invent live metrics when no provider output was run',()=>{
  const report=createSpeechBenchmarkReport('human-voice-v1',cases,[{provenance:provenance(),cases:[]}],'2026-10-28T00:00:00.000Z').providers[0]!;
  expect(report.status).toBe('NOT_RUN');expect(report.completed).toBe(0);expect(report.cer?.value).toBeNull();expect(report.caseResults).toHaveLength(cases.length);
});
