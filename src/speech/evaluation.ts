// P3C text alignment metrics; callers must supply actual ASR output and separate gold.
function distance(a:string[],b:string[]):number{let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=0;i<a.length;i++){const next=[i+1];for(let j=0;j<b.length;j++)next.push(Math.min(next[j]!+1,row[j+1]!+1,row[j]!+(a[i]===b[j]?0:1)));row=next;}return row[b.length]!;}
export function speechMetrics(reference:string,hypothesis:string,terms:string[]=[]){
 const uniqueTerms=[...new Set(terms.map(t=>t.trim().toLocaleLowerCase()).filter(Boolean))];
 const hasTerm=(term:string)=>{const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');return new RegExp('(?:^|[^A-Za-z0-9_])'+escaped+'(?:$|[^A-Za-z0-9_])','iu').test(hypothesis);};
 const chars=[...reference],words=reference.trim().split(/\s+/).filter(Boolean),gotWords=hypothesis.trim().split(/\s+/).filter(Boolean);
 const metric=(n:number,d:number)=>({numerator:n,denominator:d,value:d?n/d:null});
 return {cer:metric(distance(chars,[...hypothesis]),chars.length),wer:metric(distance(words,gotWords),words.length),codeSwitchTermAccuracy:metric(uniqueTerms.filter(hasTerm).length,uniqueTerms.length)};
}
export interface SpeechEvaluationCase { id:string; audioSha256:string; referenceTranscript:string; codeSwitchTerms:string[]; expectedConstraintTuples:string[]; expectedCardCount:number }
export interface SpeechEvaluationOutcome { caseId:string; transcript:string|null; latencyMs:number; constraintFound:number; constraintTotal:number; endToEndCardSuccess:boolean; status:'RUN'|'NOT_RUN' }

export interface SpeechBenchmarkCase extends SpeechEvaluationCase { expectedProhibitedConstraints: number }
export interface SpeechBenchmarkProvenance {
  providerId: string;
  modelId: string;
  executionMode: 'live' | 'mock';
  runtime: string;
  runtimeVersion?: string;
  hardware: { device: 'cpu' | 'hailo' | 'unknown'; modelVariant?: string; details?: string };
}
export interface SpeechBenchmarkCaseResult {
  caseId: string;
  audioSha256: string;
  status: 'completed' | 'failed' | 'timeout' | 'not_run';
  transcript: string | null;
  latencyMs: number | null;
  expectedConstraints: number;
  preservedConstraints: number;
  expectedProhibitedConstraints: number;
  preservedProhibitedConstraints: number;
  rawWorkflowSuccess: boolean | null;
  reviewedWorkflowSuccess: boolean | null;
  errorCode?: string;
}
export interface SpeechBenchmarkProviderRun {
  provenance: SpeechBenchmarkProvenance;
  cases: SpeechBenchmarkCaseResult[];
}
export interface SpeechBenchmarkMetric { numerator: number; denominator: number; value: number | null }
export interface SpeechBenchmarkProviderReport {
  provenance: SpeechBenchmarkProvenance;
  status: 'LIVE_RESULTS' | 'MOCK_ONLY' | 'NOT_RUN';
  attempted: number;
  completed: number;
  failed: number;
  timedOut: number;
  notRun: number;
  cer: SpeechBenchmarkMetric | null;
  wer: SpeechBenchmarkMetric | null;
  codeSwitchTermAccuracy: SpeechBenchmarkMetric | null;
  constraintPreservation: SpeechBenchmarkMetric | null;
  negationPreservation: SpeechBenchmarkMetric | null;
  rawWorkflowSuccess: SpeechBenchmarkMetric | null;
  reviewedWorkflowSuccess: SpeechBenchmarkMetric | null;
  latencyP50Ms: number | null;
  latencyP95Ms: number | null;
  caseResults: SpeechBenchmarkCaseResult[];
}
export interface SpeechBenchmarkReport { schemaVersion: 1; datasetVersion: string; caseCount: number; generatedAt: string; providers: SpeechBenchmarkProviderReport[] }

const rate=(numerator:number,denominator:number):SpeechBenchmarkMetric=>({numerator,denominator,value:denominator?numerator/denominator:null});
function percentile(values:number[],p:number):number|null{if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.max(0,Math.ceil(p*sorted.length)-1)]!;}
function sumMetric(values:{numerator:number;denominator:number}[]):SpeechBenchmarkMetric{
 const numerator=values.reduce((sum,v)=>sum+v.numerator,0),denominator=values.reduce((sum,v)=>sum+v.denominator,0);return rate(numerator,denominator);
}

/** Scores only actual live outcomes; mock records remain visible but produce no accuracy metrics. */
export function createSpeechBenchmarkReport(datasetVersion:string,cases:SpeechBenchmarkCase[],runs:SpeechBenchmarkProviderRun[],generatedAt=new Date().toISOString()):SpeechBenchmarkReport{
 if(!datasetVersion.trim()||!Number.isFinite(Date.parse(generatedAt))||!cases.length||new Set(cases.map(c=>c.id)).size!==cases.length||cases.some(c=>!c.id||!/^sha256:[0-9a-f]{64}$/.test(c.audioSha256)||typeof c.referenceTranscript!=='string'||!Array.isArray(c.codeSwitchTerms)||!Array.isArray(c.expectedConstraintTuples)||!Number.isInteger(c.expectedCardCount)||c.expectedCardCount<0||!Number.isInteger(c.expectedProhibitedConstraints)||c.expectedProhibitedConstraints<0||c.expectedProhibitedConstraints>c.expectedConstraintTuples.length))throw new Error('Invalid speech benchmark dataset contract.');
 if(new Set(runs.map(run=>run.provenance.providerId)).size!==runs.length)throw new Error('Provider runs must have unique provider IDs.');
 const caseById=new Map(cases.map(c=>[c.id,c]));
 const providers=runs.map(run=>{
  const {provenance}=run;
  if(!provenance.providerId||!provenance.modelId||!provenance.runtime||!['live','mock'].includes(provenance.executionMode)||!['cpu','hailo','unknown'].includes(provenance.hardware.device))throw new Error('Invalid provider provenance.');
  const seen=new Set<string>();
  for(const result of run.cases){
   const gold=caseById.get(result.caseId);
   if(!gold||seen.has(result.caseId)||result.audioSha256!==gold.audioSha256||!['completed','failed','timeout','not_run'].includes(result.status)||result.status==='completed'&&(!result.transcript||!Number.isFinite(result.latencyMs)||result.latencyMs!<0)||result.status!=='completed'&&result.transcript!==null||![null,true,false].includes(result.rawWorkflowSuccess)||![null,true,false].includes(result.reviewedWorkflowSuccess))throw new Error(`Invalid benchmark result for case ${result.caseId}.`);
   if(result.expectedConstraints!==gold.expectedConstraintTuples.length||result.expectedProhibitedConstraints!==gold.expectedProhibitedConstraints||result.preservedConstraints<0||result.preservedConstraints>result.expectedConstraints||result.preservedProhibitedConstraints<0||result.preservedProhibitedConstraints>result.expectedProhibitedConstraints)throw new Error(`Gold-label denominator mismatch for case ${result.caseId}.`);
   seen.add(result.caseId);
  }
  const results=[...cases.map(c=>run.cases.find(x=>x.caseId===c.id)??({caseId:c.id,audioSha256:c.audioSha256,status:'not_run',transcript:null,latencyMs:null,expectedConstraints:c.expectedConstraintTuples.length,preservedConstraints:0,expectedProhibitedConstraints:c.expectedProhibitedConstraints,preservedProhibitedConstraints:0,rawWorkflowSuccess:null,reviewedWorkflowSuccess:null} satisfies SpeechBenchmarkCaseResult))];
  const isMock=provenance.executionMode==='mock';
  const complete=results.filter(r=>r.status==='completed'&&r.transcript!==null);
  const score=complete.map(result=>{
   const gold=caseById.get(result.caseId)!;const metric=speechMetrics(gold.referenceTranscript,result.transcript!,gold.codeSwitchTerms);
   return {cer:{numerator:metric.cer.value===null?0:Math.round(metric.cer.value*metric.cer.denominator),denominator:metric.cer.denominator},wer:{numerator:metric.wer.value===null?0:Math.round(metric.wer.value*metric.wer.denominator),denominator:metric.wer.denominator},terms:{numerator:metric.codeSwitchTermAccuracy.value===null?0:Math.round(metric.codeSwitchTermAccuracy.value*metric.codeSwitchTermAccuracy.denominator),denominator:metric.codeSwitchTermAccuracy.denominator}};
  });
  const boolMetric=(key:'rawWorkflowSuccess'|'reviewedWorkflowSuccess')=>{const values=complete.filter(r=>r[key]!==null);return rate(values.filter(r=>r[key]===true).length,values.length);};
  const attempted=results.filter(r=>r.status!=='not_run').length;
  const status:SpeechBenchmarkProviderReport['status']=isMock?'MOCK_ONLY':attempted?'LIVE_RESULTS':'NOT_RUN';
  return {provenance,status,attempted:isMock?0:attempted,completed:isMock?0:complete.length,failed:isMock?0:results.filter(r=>r.status==='failed').length,timedOut:isMock?0:results.filter(r=>r.status==='timeout').length,notRun:results.filter(r=>r.status==='not_run').length,cer:isMock?null:sumMetric(score.map(s=>s.cer)),wer:isMock?null:sumMetric(score.map(s=>s.wer)),codeSwitchTermAccuracy:isMock?null:sumMetric(score.map(s=>s.terms)),constraintPreservation:isMock?null:rate(complete.reduce((n,r)=>n+r.preservedConstraints,0),complete.reduce((n,r)=>n+r.expectedConstraints,0)),negationPreservation:isMock?null:rate(complete.reduce((n,r)=>n+r.preservedProhibitedConstraints,0),complete.reduce((n,r)=>n+r.expectedProhibitedConstraints,0)),rawWorkflowSuccess:isMock?null:boolMetric('rawWorkflowSuccess'),reviewedWorkflowSuccess:isMock?null:boolMetric('reviewedWorkflowSuccess'),latencyP50Ms:isMock?null:percentile(complete.map(r=>r.latencyMs!),0.5),latencyP95Ms:isMock?null:percentile(complete.map(r=>r.latencyMs!),0.95),caseResults:results};
 });
 return {schemaVersion:1,datasetVersion,caseCount:cases.length,generatedAt,providers};
}
