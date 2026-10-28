import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import type { SpeechProvider, SpeechResult } from '../../src/contracts/speech.js';
import type { HailoHealthRequest, HailoTranscribeRequest } from '../../src/contracts/hailo-worker.js';
import { HAILO_WORKER_PROTOCOL } from '../../src/contracts/hailo-worker.js';
import { confirmTranscript, editTranscript, speechProvenance } from '../../src/speech/session.js';
import { HailoSpeechRecognizer, MockHailoWorkerClient, UnavailableHailoWorkerClient } from '../../src/speech/hailo.js';
import { PythonHailoMockWorkerClient } from '../../src/speech/hailo-mock-process.js';
import { SpeechProviderRegistry } from '../../src/speech/providers.js';
import { identifyAudio, SpeechError } from '../../src/speech/audio.js';
import { EXAMPLE, createWorkspace, confirmCard } from '../../src/web/state/workspace.js';
import { wav } from './helpers.js';

const workerPath = fileURLToPath(new URL('../../src/speech/hailo-worker-contract.py', import.meta.url));
const audioFormat = { container:'wav', encoding:'pcm_s16le', sampleRateHz:16000, channels:1, bitsPerSample:16 } as const;

it('labels mock Hailo output explicitly and verifies original audio SHA-256', async () => {
  const bytes=wav(),source=await identifyAudio(bytes,'case.wav');
  const result=await new HailoSpeechRecognizer(new MockHailoWorkerClient(),'base').transcribe(bytes,source);
  expect(result).toMatchObject({status:'success',provider:'hailo-10h',modelId:'whisper-base',sourceAudioId:source.id,runtime:{mode:'mock',device:'unknown'}});
  expect(result.transcript).toContain('MOCK ONLY');
  expect(result.audioFormat).toEqual(audioFormat);
  expect(result.confidence).toBeUndefined();
});

it('returns HARDWARE_UNAVAILABLE without pretending the mock worker is a device', async () => {
  const bytes=wav(),source=await identifyAudio(bytes,'case.wav'),transcribe=vi.fn();
  const worker=new UnavailableHailoWorkerClient();worker.transcribe=transcribe;
  const result=await new HailoSpeechRecognizer(worker).transcribe(bytes,source);
  expect(result.status).toBe('failed');expect(result.errors[0]?.code).toBe('HARDWARE_UNAVAILABLE');expect(transcribe).not.toHaveBeenCalled();
});

it('fails closed for invalid WAV, oversized input, mismatched digest, malformed JSON value and timeout', async () => {
  const bytes=wav(),source=await identifyAudio(bytes,'case.wav');
  const invalid=await new HailoSpeechRecognizer(new MockHailoWorkerClient()).transcribe(new Uint8Array(44),source);
  expect(invalid.status).toBe('failed');expect(invalid.errors[0]?.code).toMatch(/CORRUPTED_AUDIO|FORMAT/);
  const oversized=await new HailoSpeechRecognizer(new MockHailoWorkerClient()).transcribe(new Uint8Array(4_000_001),source);
  expect(oversized.errors[0]?.code).toBe('TOO_LARGE');
  const wrongDigest={executionMode:'mock' as const,health:async(r:HailoHealthRequest)=>({protocol:HAILO_WORKER_PROTOCOL,requestId:r.requestId,operation:'health',status:'mock-only',providerId:'hailo-10h',deviceDetected:false}),transcribe:async(r:HailoTranscribeRequest)=>({protocol:HAILO_WORKER_PROTOCOL,requestId:r.requestId,operation:'transcribe',status:'success',executionMode:'mock',providerId:'hailo-10h',modelId:r.modelId,sourceAudioId:r.sourceAudioId,audioSha256:'0'.repeat(64),transcript:'fabricated',language:null,inferenceDurationMs:1})};
  const mismatch=await new HailoSpeechRecognizer(wrongDigest).transcribe(bytes,source);expect(mismatch.errors[0]?.code).toBe('CORRUPTED_AUDIO');
  const malformed={executionMode:'mock' as const,health:async()=>({bad:'json'}),transcribe:vi.fn()};
  const bad=await new HailoSpeechRecognizer(malformed).transcribe(bytes,source);expect(bad.errors[0]?.code).toBe('WORKER_PROTOCOL');expect(malformed.transcribe).not.toHaveBeenCalled();
  const timeout={executionMode:'live' as const,health:async()=>{throw new SpeechError('TIMEOUT','test timeout');},transcribe:vi.fn()};
  const timed=await new HailoSpeechRecognizer(timeout).transcribe(bytes,source);expect(timed.errors[0]?.code).toBe('TIMEOUT');
});

it('Python worker protocol distinguishes mock-only from absent Hailo hardware', async () => {
  const bytes=wav(),source=await identifyAudio(bytes,'case.wav');
  const mock=new PythonHailoMockWorkerClient();
  const result=await new HailoSpeechRecognizer(mock,'tiny').transcribe(bytes,source);
  expect(result).toMatchObject({status:'success',runtime:{mode:'mock'},modelId:'whisper-tiny'});
  const noHardware=spawnSync('python3',[workerPath],{input:JSON.stringify({protocol:HAILO_WORKER_PROTOCOL,requestId:'health-1',operation:'health'})+'\n',encoding:'utf8',timeout:5000});
  expect(noHardware.status).toBe(0);expect(JSON.parse(noHardware.stdout)).toMatchObject({status:'hardware-unavailable',deviceDetected:false,errorCode:'HARDWARE_UNAVAILABLE'});
});

it('enforces a finite Python worker process timeout', async () => {
  const client=new PythonHailoMockWorkerClient('python3',1);
  await expect(client.health({protocol:HAILO_WORKER_PROTOCOL,requestId:'timeout-1',operation:'health'})).rejects.toMatchObject({code:'TIMEOUT'});
});

it('Python worker rejects paths, invalid JSON, and forged audio SHA', async () => {
  const run=(input:string)=>spawnSync('python3',[workerPath,'--mock'],{input,encoding:'utf8',timeout:5000});
  expect(JSON.parse(run('{broken\n').stdout)).toMatchObject({errorCode:'WORKER_PROTOCOL'});
  const bytes=wav(),source=await identifyAudio(bytes,'case.wav');
  const request={protocol:HAILO_WORKER_PROTOCOL,requestId:'transcribe-1',operation:'transcribe',providerId:'hailo-10h',modelId:'whisper-base',sourceAudioId:source.id,audioFormat,audioBase64:Buffer.from(bytes).toString('base64'),audioPath:'/etc/passwd'};
  expect(JSON.parse(run(JSON.stringify(request)+'\n').stdout)).toMatchObject({errorCode:'WORKER_PROTOCOL'});
  delete (request as {audioPath?:string}).audioPath;request.sourceAudioId='sha256:'+'0'.repeat(64);
  expect(JSON.parse(run(JSON.stringify(request)+'\n').stdout)).toMatchObject({errorCode:'CORRUPTED_AUDIO'});
  expect(createHash('sha256').update(bytes).digest('hex')).not.toBe(request.sourceAudioId.slice(7));
});

it('provider changes start a new unconfirmed transcript session and preserve old evidence', async () => {
  const bytes=wav(),source=await identifyAudio(bytes,'case.wav');
  const make=(providerId:string,modelId:string,transcript:string):SpeechProvider=>({providerId,modelId,executionMode:'mock',transcribe:async()=>({sourceAudioId:source.id,transcript,language:null,modelId,provider:providerId,duration:source.duration,inferenceDuration:1,audioFormat,runtime:{mode:'mock',runtime:'unit-test',device:'unknown'},status:'success',errors:[]} satisfies SpeechResult)});
  const registry=new SpeechProviderRegistry();registry.register(make('whisper-a','model-a',EXAMPLE));registry.register(make('hailo-10h','whisper-base','unreviewed provider B transcript'));
  const old=await registry.startSession('whisper-a',bytes,source);const reviewed=confirmTranscript(editTranscript(old,EXAMPLE));
  const workspace=createWorkspace(EXAMPLE,speechProvenance(reviewed));const confirmed=confirmCard(workspace,workspace.cards[1]!.id);
  const next=await registry.startSession('hailo-10h',bytes,source);
  expect(next.recognition.provider).toBe('hailo-10h');expect(next.edits).toEqual([]);expect(next.revision).toBe(0);expect(next.confirmedRevision).toBeNull();expect(()=>speechProvenance(next)).toThrow();
  expect(confirmed.cards[1]!.current.status).toBe('confirmed');expect(confirmed.cards[1]!.current.evidence.text).toBe('check sandbox credentials');
  const confirmedNext=confirmTranscript(next);const newWorkspace=createWorkspace(confirmedNext.transcript,speechProvenance(confirmedNext));
  expect(newWorkspace.cards.every(card=>card.current.status==='draft'&&card.current.requiresConfirmation)).toBe(true);
  expect(newWorkspace.speech?.session.recognition.provider).toBe('hailo-10h');
});

it('rejects duplicate registrations and provider/result identity mismatch', async () => {
  const bytes=wav(),source=await identifyAudio(bytes,'case.wav'),registry=new SpeechProviderRegistry();
  const provider:SpeechProvider={providerId:'selected',modelId:'model',executionMode:'mock',transcribe:async()=>({sourceAudioId:source.id,transcript:'x',language:null,provider:'other',modelId:'wrong',duration:source.duration,inferenceDuration:1,audioFormat,runtime:{mode:'mock',runtime:'unit-test',device:'unknown'},status:'success',errors:[]})};
  registry.register(provider);expect(()=>registry.register(provider)).toThrow('unique');await expect(registry.transcribe('selected',bytes,source)).rejects.toThrow('selected provider');
});
