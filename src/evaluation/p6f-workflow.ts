/** P6F measurement contract. Automated tests validate the evaluator; they are never user-study observations. */
export const P6F_SCHEMA_VERSION = 1 as const;
export const P6F_METHODS = ['manual', 'routine-template', 'speech-transcript', 'encrypted-collaboration'] as const;
export type P6FMethod = typeof P6F_METHODS[number];
export interface WorkflowScenario {
  id: string;
  method: P6FMethod;
  title: string;
  taskBrief: string;
  expectedCards: number;
  expectedConstraints: string[];
  completionRule: string;
}
export interface HumanWorkflowObservation {
  id: string;
  scenarioId: string;
  method: P6FMethod;
  evidenceKind: 'human_observation';
  startedAt: string;
  finishedAt: string;
  operationCount: number;
  manualCorrectionCount: number;
  expectedCardCount: number;
  completeCardCount: number;
  expectedConstraintCount: number;
  preservedConstraintCount: number;
  collaborationConflictCount: number;
  expectedTaskCount: number;
  completedTaskCount: number;
  notes?: string;
}
export interface WorkflowBenchmarkInput {
  schemaVersion: typeof P6F_SCHEMA_VERSION;
  scenarios: WorkflowScenario[];
  observations: HumanWorkflowObservation[];
}
export interface MethodMetrics {
  humanObservationCount: number;
  durationMs: { median: number | null; p95: number | null };
  operationCount: { mean: number | null };
  manualCorrectionCount: { mean: number | null };
  completeCardSuccess: { numerator: number; denominator: number };
  constraintPreservation: { numerator: number; denominator: number };
  collaborationConflicts: { total: number | null };
  taskCompletion: { numerator: number; denominator: number };
}
export interface P6FReport {
  schemaVersion: typeof P6F_SCHEMA_VERSION;
  status: 'HUMAN_EVALUATION_NOT_RUN' | 'HUMAN_EVALUATION_RECORDED';
  generatedAt: string;
  automationTimingUsedAsHumanTiming: false;
  methods: Record<P6FMethod, MethodMetrics>;
  observations: HumanWorkflowObservation[];
}

export const P6F_SCENARIOS: WorkflowScenario[] = [
  {id:'p6f-manual-01',method:'manual',title:'Manual multi-card creation',taskBrief:'Create a small set of work cards from a supplied mixed-language instruction and preserve all stated constraints.',expectedCards:3,expectedConstraints:['preserve source prohibition'],completionRule:'Cards have required fields, source review is complete, and each card remains human-confirmed only by an explicit user action.'},
  {id:'p6f-template-01',method:'routine-template',title:'Routine template workflow',taskBrief:'Start from a relevant routine template, tailor its cards, and review them.',expectedCards:3,expectedConstraints:['preserve prerequisites'],completionRule:'Required cards and prerequisites are reviewed; no external action is executed.'},
  {id:'p6f-speech-01',method:'speech-transcript',title:'Confirmed speech transcript workflow',taskBrief:'Use a provided transcript, correct it if needed, confirm the transcript, then analyze and review cards.',expectedCards:3,expectedConstraints:['preserve negation'],completionRule:'Transcript confirmation precedes parsing and all expected card evidence is reviewed.'},
  {id:'p6f-collaboration-01',method:'encrypted-collaboration',title:'Encrypted collaborator exchange',taskBrief:'Export an encrypted request, exchange it with a collaborator, import a reply, and resolve any conflicts.',expectedCards:3,expectedConstraints:['preserve constraints','do not inherit confirmation'],completionRule:'Exchange is decrypted, provenance reviewed, conflicts explicitly resolved, and imported confirmations are not trusted.'},
];

const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const iso=(v:unknown):v is string=>typeof v==='string'&&!Number.isNaN(Date.parse(v));
const finiteNonnegative=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
export function validateP6FInput(value:unknown):WorkflowBenchmarkInput {
  if(!record(value)||value.schemaVersion!==P6F_SCHEMA_VERSION||!Array.isArray(value.scenarios)||!Array.isArray(value.observations))throw new Error('Unsupported P6F evaluation input.');
  const scenarios=value.scenarios as unknown[];
  if(scenarios.length!==P6F_SCENARIOS.length||!scenarios.every((s,i)=>record(s)&&s.id===P6F_SCENARIOS[i]?.id&&s.method===P6F_SCENARIOS[i]?.method&&typeof s.title==='string'&&typeof s.taskBrief==='string'&&finiteNonnegative(s.expectedCards)&&Array.isArray(s.expectedConstraints)&&s.expectedConstraints.every(x=>typeof x==='string')&&typeof s.completionRule==='string'))throw new Error('P6F scenarios do not match the versioned protocol.');
  const ids=new Set<string>();
  for(const item of value.observations){
    if(!record(item)||typeof item.id!=='string'||!item.id||ids.has(item.id)||!P6F_METHODS.includes(item.method as P6FMethod)||!scenarios.some(s=>record(s)&&s.id===item.scenarioId&&s.method===item.method)||item.evidenceKind!=='human_observation'||!iso(item.startedAt)||!iso(item.finishedAt)||Date.parse(item.finishedAt)<Date.parse(item.startedAt)||!['operationCount','manualCorrectionCount','expectedCardCount','completeCardCount','expectedConstraintCount','preservedConstraintCount','collaborationConflictCount','expectedTaskCount','completedTaskCount'].every(k=>finiteNonnegative(item[k]))||Number(item.completeCardCount)>Number(item.expectedCardCount)||Number(item.preservedConstraintCount)>Number(item.expectedConstraintCount)||Number(item.completedTaskCount)>Number(item.expectedTaskCount)||item.notes!==undefined&&typeof item.notes!=='string')throw new Error('Invalid human workflow observation; automated test data cannot be recorded as participant evidence.');
    ids.add(item.id);
  }
  return structuredClone(value) as unknown as WorkflowBenchmarkInput;
}
function quantile(values:number[],q:number):number|null {if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.ceil(q*sorted.length)-1]??null;}
function mean(values:number[]):number|null{return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;}
export function evaluateP6F(inputValue:unknown,generatedAt=new Date().toISOString()):P6FReport {
  const input=validateP6FInput(inputValue);
  const methods=Object.fromEntries(P6F_METHODS.map(method=>{
    const rows=input.observations.filter(o=>o.method===method), durations=rows.map(o=>Date.parse(o.finishedAt)-Date.parse(o.startedAt));
    const cards=rows.reduce((a,o)=>a+o.expectedCardCount,0),constraints=rows.reduce((a,o)=>a+o.expectedConstraintCount,0),tasks=rows.reduce((a,o)=>a+o.expectedTaskCount,0);
    return [method,{humanObservationCount:rows.length,durationMs:{median:quantile(durations,.5),p95:quantile(durations,.95)},operationCount:{mean:mean(rows.map(o=>o.operationCount))},manualCorrectionCount:{mean:mean(rows.map(o=>o.manualCorrectionCount))},completeCardSuccess:{numerator:rows.reduce((a,o)=>a+o.completeCardCount,0),denominator:cards},constraintPreservation:{numerator:rows.reduce((a,o)=>a+o.preservedConstraintCount,0),denominator:constraints},collaborationConflicts:{total:rows.length?rows.reduce((a,o)=>a+o.collaborationConflictCount,0):null},taskCompletion:{numerator:rows.reduce((a,o)=>a+o.completedTaskCount,0),denominator:tasks}}];
  })) as Record<P6FMethod,MethodMetrics>;
  return {schemaVersion:1,status:input.observations.length?'HUMAN_EVALUATION_RECORDED':'HUMAN_EVALUATION_NOT_RUN',generatedAt,automationTimingUsedAsHumanTiming:false,methods,observations:input.observations};
}
export function renderP6FMarkdown(report:P6FReport):string {
  const lines=['# P6F Workflow Efficiency Evaluation','',`Status: **${report.status}**`,'','This report compares manual card creation, routine templates, confirmed speech transcripts, and encrypted collaboration. Automated test durations and operation counts are never presented as human workflow measurements.','',`Generated: ${report.generatedAt}`,'','| Method | Human observations | Duration median / P95 (ms) | Mean operations | Mean corrections | Complete cards | Constraints preserved | Conflicts | Tasks completed |','|---|---:|---:|---:|---:|---:|---:|---:|---:|'];
  for(const method of P6F_METHODS){const m=report.methods[method];lines.push(`| ${method} | ${m.humanObservationCount} | ${m.durationMs.median??'NOT_RUN'} / ${m.durationMs.p95??'NOT_RUN'} | ${m.operationCount.mean??'NOT_RUN'} | ${m.manualCorrectionCount.mean??'NOT_RUN'} | ${m.completeCardSuccess.numerator}/${m.completeCardSuccess.denominator} | ${m.constraintPreservation.numerator}/${m.constraintPreservation.denominator} | ${m.collaborationConflicts.total??'NOT_RUN'} | ${m.taskCompletion.numerator}/${m.taskCompletion.denominator} |`);}
  lines.push('','## Interpretation','','No real participant observations have been supplied. Empty denominators are not zero scores; they mean not measured. Automated tests establish only that the evaluation code validates and summarizes evidence correctly.','','## Versioned scenarios','');
  for(const s of P6F_SCENARIOS)lines.push(`- **${s.id} — ${s.title}:** ${s.taskBrief} Completion: ${s.completionRule}`);
  lines.push('');return lines.join('\n');
}
