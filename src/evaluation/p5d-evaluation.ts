import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { extract } from '../engine/extract.js';
import { validate } from '../engine/validate.js';
import { segments } from '../engine/rules.js';
import { buildP5DDataset, p5dDatasetSha256, P5D_DATASET_VERSION, type P5DCase, type P5DGold, type P5DMutation } from './p5d-dataset.js';

export type P5DMode='baseline'|'final';
type Rate={numerator:number;denominator:number;value:number|null};
export interface P5DCaseResult {
 id:string;sourceCaseId:string;category:P5DCase['category'];language:P5DCase['language'];split:P5DCase['split'];kind:P5DCase['kind'];mutation:P5DMutation|null;input:string;gold:P5DGold;
 proposal:{intents:P5DGold['intents'];constraints:P5DGold['constraints'];unresolvedCount:number;validationValid:boolean;validationErrors:string[]};
 acceptedIntents:P5DGold['intents'];acceptedConstraints:P5DGold['constraints'];blocked:boolean;blockReasons:string[];evidence:{valid:number;total:number};
 intentExactMatch:boolean;proposalIntentExactMatch:boolean;constraintRecall:Rate;constraintScopeAccuracy:Rate;negationFlip:boolean;proposalUnsupportedActions:Rate;unsupportedActions:Rate;safeRejection:boolean;falseRejection:boolean;humanConfirmation:{required:number;total:number};completeWorkflowSuccess:boolean;outcomeFlags:{constraintRecognized:boolean;safeRejected:boolean;constraintMissed:boolean;incorrectWorkCard:boolean;negationDeletionUnrecoverable:boolean;negationFlipPrevented:boolean};
}
export interface P5DAggregate {
 cases:number;originals:number;synthetic:number;intentExactMatch:Rate;proposalIntentExactMatch:Rate;constraintRecall:Rate;constraintScopeAccuracy:Rate;negationFlipRate:Rate;unsupportedActionRate:Rate;acceptedUnsupportedActionRate:Rate;evidenceValidity:Rate;safeRejectionRate:Rate;falseRejectionRate:Rate;humanConfirmation:Rate;completeWorkflowSuccess:Rate;
 outcomeCounts:{constraintRecognized:number;safeRejected:number;constraintMissed:number;incorrectWorkCard:number;negationDeletionUnrecoverable:number;negationFlipPrevented:number};
}
export interface P5DReport {schemaVersion:1;status:'SYNTHETIC_ONLY';mode:P5DMode;datasetVersion:string;datasetSha256:string;splitSeed:string;variantSeed:string;generatedAt:string;liveASR:false;counts:{originals:number;synthetic:number;total:number;development:number;heldOut:number};metrics:{development:P5DAggregate;heldOut:P5DAggregate;all:P5DAggregate};baselineComparison?:Record<'development'|'heldOut'|'all',{baselineCompleteWorkflowSuccess:Rate;finalCompleteWorkflowSuccess:Rate;baselineIntentExactMatch:Rate;finalIntentExactMatch:Rate;baselineConstraintRecall:Rate;finalConstraintRecall:Rate;baselineConstraintScopeAccuracy:Rate;finalConstraintScopeAccuracy:Rate;baselineNegationFlipRate:Rate;finalNegationFlipRate:Rate;baselineUnsupportedActionRate:Rate;finalUnsupportedActionRate:Rate;baselineEvidenceValidity:Rate;finalEvidenceValidity:Rate;baselineSafeRejection:Rate;finalSafeRejection:Rate;baselineFalseRejection:Rate;finalFalseRejection:Rate}>;cases:P5DCaseResult[];p4gDrafts:Array<{proposalId:string;feedbackIds:string[];sourceCaseId:string;testCaseId:string;split:P5DCase['split'];category:P5DCase['category'];title:string;problemStatement:string;status:'draft';requiresHumanReview:true;verifiedDefect:false;sourceReferences:{datasetVersion:string;datasetSha256:string;testCaseId:string}}>;limitations:string[]}

const ratio=(n:number,d:number):Rate=>({numerator:n,denominator:d,value:d?n/d:null});
const normalizedIntents=(xs:P5DGold['intents'])=>xs.map(x=>`${x.type}|${x.action}|${x.target}`).sort();
const normalizedConstraints=(xs:P5DGold['constraints'])=>xs.map(x=>`${x.action}|${x.polarity}|${x.scope}`).sort();
function evidence(items:unknown[],input:string):{valid:number;total:number}{let valid=0,total=0;for(const item of items){if(!item||typeof item!=='object'||!('evidence'in item))continue;const e=(item as {evidence?:unknown}).evidence;if(!e||typeof e!=='object')continue;total++;const x=e as {text?:unknown;start?:unknown;end?:unknown};if(typeof x.text==='string'&&Number.isInteger(x.start)&&Number.isInteger(x.end)&&input.slice(x.start as number,x.end as number)===x.text)valid++;}return{valid,total};}
const riskyAction=/(?:deploy|delete|send|publish|upload|restart|modify|部署|刪除|寄送|寄出|發送|發布|上傳|重啟|修改|清除)/iu;
const prohibitionCue=/(?:don't|do not|never|must not|cannot|can't|禁止|不得|不要|不可以|請勿|不能|不可|勿)/iu;
const conditionCue=/(?:unless|until|before|after|only if|except|provided that|除非|否則|直到|之前|以後|才能|必須先|先.*再)/iu;

function evaluateOne(item:P5DCase,mode:P5DMode):P5DCaseResult{
 const proposal=extract(item.input),validation=validate(item.input,proposal);
 const riskClauses=segments(item.input).filter(e=>riskyAction.test(e.text)&&(prohibitionCue.test(e.text)||conditionCue.test(e.text)));
 const unresolvedRisk=proposal.unresolved.some(u=>riskyAction.test(u.evidence.text)&&(prohibitionCue.test(u.evidence.text)||conditionCue.test(u.evidence.text)));
 const riskUnrepresented=riskClauses.some(r=>!proposal.constraints.some(c=>c.evidence.start===r.start&&c.evidence.end===r.end&&c.evidence.text===r.text));
 const hasUnresolvedCondition=segments(item.input).some(e=>conditionCue.test(e.text));
 const blockReasons:string[]=[];
 if(mode==='final'){
  if(!validation.valid)blockReasons.push('independent_p0_validator_rejected');
  if(unresolvedRisk||riskUnrepresented)blockReasons.push('unresolved_or_unrepresented_prohibition');
  if(proposal.unresolved.length>0)blockReasons.push('unresolved_segment_requires_manual_review');
  if(hasUnresolvedCondition)blockReasons.push('condition_or_exception_requires_manual_review');
 }
 const blocked=mode==='final'&&blockReasons.length>0;
 const proposalIntents=proposal.cards.map(c=>({type:'task' as const,action:c.fields.action,target:'target'in c.fields?c.fields.target:c.fields.recipientName??c.fields.language??''}));
 const proposalConstraints=proposal.constraints.map(c=>({action:c.action,polarity:c.polarity,scope:c.scope}));
 const acceptedIntents=blocked?[]:proposalIntents,acceptedConstraints=proposalConstraints;
 const expectedIntents=normalizedIntents(item.gold.intents),gotIntents=normalizedIntents(acceptedIntents);
 const intentExactMatch=expectedIntents.length===gotIntents.length&&expectedIntents.every((x,i)=>x===gotIntents[i]);
 const rawIntents=normalizedIntents(proposalIntents);
 const proposalIntentExactMatch=expectedIntents.length===rawIntents.length&&expectedIntents.every((x,i)=>x===rawIntents[i]);
 const matchedConstraintCount=item.gold.constraints.filter(g=>proposalConstraints.some(p=>p.action===g.action&&p.polarity===g.polarity)).length;
 const scopedConstraintCount=item.gold.constraints.filter(g=>proposalConstraints.some(p=>p.action===g.action&&p.polarity===g.polarity&&p.scope===g.scope)).length;
 const constraintRecall=ratio(matchedConstraintCount,item.gold.constraints.length);
 const constraintScopeAccuracy=ratio(scopedConstraintCount,item.gold.constraints.length);
 const proposalUnsupportedCount=proposalIntents.filter(p=>!item.gold.intents.some(g=>g.action===p.action&&g.target===p.target&&g.type===p.type)).length;
 const acceptedUnsupportedCount=acceptedIntents.filter(p=>!item.gold.intents.some(g=>g.action===p.action&&g.target===p.target&&g.type===p.type)).length;
 const proposalUnsupportedActions=ratio(proposalUnsupportedCount,proposalIntents.length);
 const unsupportedActions=ratio(acceptedUnsupportedCount,acceptedIntents.length);
 const ev=evidence([...proposal.cards,...proposal.constraints,...proposal.unresolved],item.input);
 const constraintRecognized=matchedConstraintCount===item.gold.constraints.length&&scopedConstraintCount===item.gold.constraints.length;
 const proposalConflict=proposalIntents.some(p=>item.gold.constraints.some(c=>c.polarity==='prohibited'&&c.action===p.action&&(c.scope==='*'||c.scope===p.target)));
 const acceptedConflict=acceptedIntents.some(p=>item.gold.constraints.some(c=>c.polarity==='prohibited'&&c.action===p.action&&(c.scope==='*'||c.scope===p.target)));
 const safeRejection=blocked||(acceptedIntents.length===0&&proposal.unresolved.length>0&&!acceptedConflict);
 const falseRejection=item.kind==='original'&&item.gold.expectedDisposition==='draft'&&safeRejection;
 const negationFlip=item.mutation?.type==='negation_deletion'&&proposalConflict;
 const negationFlipPrevented=negationFlip&&blocked&&!acceptedConflict;
 const confirmations=proposal.cards.filter(c=>c.status==='draft'&&c.requiresConfirmation===true).length;
 const humanConfirmation={required:blocked?0:confirmations,total:acceptedIntents.length};
 const unresolvedOkay=!item.gold.expectsUnresolved||proposal.unresolved.length>0;
 const completeWorkflowSuccess=item.gold.expectedDisposition==='draft'&&!blocked&&intentExactMatch&&constraintRecall.value===1&&constraintScopeAccuracy.value===1&&ev.valid===ev.total&&ev.total>0&&acceptedUnsupportedCount===0&&humanConfirmation.required===humanConfirmation.total&&unresolvedOkay;
 const incorrectWorkCard=proposalUnsupportedCount>0||proposalConflict;
 return{id:item.id,sourceCaseId:item.sourceCaseId,category:item.category,language:item.language,split:item.split,kind:item.kind,mutation:item.mutation?.type??null,input:item.input,gold:item.gold,proposal:{intents:proposalIntents,constraints:proposalConstraints,unresolvedCount:proposal.unresolved.length,validationValid:validation.valid,validationErrors:validation.errors},acceptedIntents,acceptedConstraints,blocked,blockReasons,evidence:ev,intentExactMatch,proposalIntentExactMatch,constraintRecall,constraintScopeAccuracy,negationFlip,proposalUnsupportedActions,unsupportedActions,safeRejection,falseRejection,humanConfirmation,completeWorkflowSuccess,outcomeFlags:{constraintRecognized,safeRejected:safeRejection,constraintMissed:matchedConstraintCount<item.gold.constraints.length,incorrectWorkCard,negationDeletionUnrecoverable:item.mutation?.type==='negation_deletion'&&item.gold.constraints.length>0,negationFlipPrevented}};
}

function aggregate(rows:P5DCaseResult[]):P5DAggregate{
 const original=rows.filter(r=>r.kind==='original'),synthetic=rows.filter(r=>r.kind==='synthetic_variant');
 const allConstraints=rows.reduce((n,r)=>n+r.gold.constraints.length,0);
 const recallN=rows.reduce((n,r)=>n+r.constraintRecall.numerator,0);
 const scopeN=rows.reduce((n,r)=>n+r.constraintScopeAccuracy.numerator,0);
 const intentsTotal=rows.reduce((n,r)=>n+r.gold.intents.length,0);
 const intentExact=rows.filter(r=>r.intentExactMatch).length;
 const unsupportedN=rows.reduce((n,r)=>n+r.proposalUnsupportedActions.numerator,0),unsupportedD=rows.reduce((n,r)=>n+r.proposalUnsupportedActions.denominator,0);
 const acceptedUnsupportedN=rows.reduce((n,r)=>n+r.unsupportedActions.numerator,0),acceptedUnsupportedD=rows.reduce((n,r)=>n+r.unsupportedActions.denominator,0);
 const evidenceN=rows.reduce((n,r)=>n+r.evidence.valid,0),evidenceD=rows.reduce((n,r)=>n+r.evidence.total,0);
 const safeCases=synthetic.filter(r=>r.gold.expectedDisposition==='safe_reject');
 const falseRejectDen=original.filter(r=>r.gold.expectedDisposition==='draft').length;
 const confirmN=rows.reduce((n,r)=>n+r.humanConfirmation.required,0),confirmD=rows.reduce((n,r)=>n+r.humanConfirmation.total,0);
 const countFlag=(key:keyof P5DCaseResult['outcomeFlags'])=>rows.filter(r=>r.outcomeFlags[key]).length;
 return{cases:rows.length,originals:original.length,synthetic:synthetic.length,intentExactMatch:ratio(intentExact,rows.length),proposalIntentExactMatch:ratio(rows.filter(r=>r.proposalIntentExactMatch).length,rows.length),constraintRecall:ratio(recallN,allConstraints),constraintScopeAccuracy:ratio(scopeN,allConstraints),negationFlipRate:ratio(rows.filter(r=>r.mutation==='negation_deletion').filter(r=>r.negationFlip).length,rows.filter(r=>r.mutation==='negation_deletion'&&r.gold.constraints.some(c=>c.polarity==='prohibited')).length),unsupportedActionRate:ratio(unsupportedN,unsupportedD),acceptedUnsupportedActionRate:ratio(acceptedUnsupportedN,acceptedUnsupportedD),evidenceValidity:ratio(evidenceN,evidenceD),safeRejectionRate:ratio(safeCases.filter(r=>r.safeRejection).length,safeCases.length),falseRejectionRate:ratio(original.filter(r=>r.falseRejection).length,falseRejectDen),humanConfirmation:ratio(confirmN,confirmD),completeWorkflowSuccess:ratio(rows.filter(r=>r.completeWorkflowSuccess).length,original.length),outcomeCounts:{constraintRecognized:countFlag('constraintRecognized'),safeRejected:countFlag('safeRejected'),constraintMissed:countFlag('constraintMissed'),incorrectWorkCard:countFlag('incorrectWorkCard'),negationDeletionUnrecoverable:countFlag('negationDeletionUnrecoverable'),negationFlipPrevented:countFlag('negationFlipPrevented')} };
}

export function buildP5DBaselineReport(args:{generatedAt?:string}={}):P5DReport{
 const cases=buildP5DDataset().map(c=>evaluateOne(c,'baseline'));
 return{schemaVersion:1,status:'SYNTHETIC_ONLY',mode:'baseline',datasetVersion:P5D_DATASET_VERSION,datasetSha256:p5dDatasetSha256(buildP5DDataset()),splitSeed:'codeswitch-p5d-split-2026-01',variantSeed:'codeswitch-p5d-perturb-2026-01',generatedAt:args.generatedAt??new Date().toISOString(),liveASR:false,counts:{originals:100,synthetic:300,total:400,development:cases.filter(c=>c.split==='development').length,heldOut:cases.filter(c=>c.split==='held-out').length},metrics:{development:aggregate(cases.filter(c=>c.split==='development')),heldOut:aggregate(cases.filter(c=>c.split==='held-out')),all:aggregate(cases)},cases,p4gDrafts:[],limitations:['All inputs are original synthetic text. The three corruptions are deterministic error injections, not Whisper outputs or empirical ASR frequencies.','The held-out split is locked by source case ID; variants inherit their parent split. Do not use held-out outcomes to change rules.','The P0 parser covers a limited grammar. A safe rejection is not counted as complete workflow success.','A deleted negation may make the remaining transcript semantically affirmative; without source audio or ASR alternatives, the original intent cannot be reconstructed from text alone.']};
}

/** Applies a benchmark-only fail-closed gate; the P0 parser and product UI remain unchanged. */
export function buildP5DFinalReport(args:{generatedAt?:string}={}):P5DReport{
 const dataset=buildP5DDataset();
 const cases=dataset.map(c=>evaluateOne(c,'final'));
 const baseline=buildP5DBaselineReport({generatedAt:'baseline-reference'});
 const baselineById=new Map(baseline.cases.map(c=>[c.id,c]));
 const devFailures=cases.filter(c=>c.split==='development'&&c.kind==='original'&&!c.completeWorkflowSuccess);
 const p4gDrafts=devFailures.slice(0,12).map((c,index)=>{
  const causes:string[]=[];
  if(c.constraintRecall.value!==1)causes.push('constraint not captured');
  if(c.constraintScopeAccuracy.value!==1)causes.push('constraint scope mismatch');
  if(c.outcomeFlags.incorrectWorkCard)causes.push('unsupported or conflicting work card');
  if(c.blocked)causes.push('fail-closed gate blocked the proposal');
  if(c.evidence.valid<c.evidence.total)causes.push('evidence validation issue');
  const before=baselineById.get(c.id);
  const causeText=causes.length?causes.join('; '):'workflow did not satisfy all benchmark criteria';
  return{proposalId:`p5d-draft-${String(index+1).padStart(3,'0')}`,feedbackIds:[],sourceCaseId:c.sourceCaseId,testCaseId:c.id,split:c.split,category:c.category,title:`Review ${c.category} workflow robustness`,problemStatement:`Synthetic benchmark case ${c.id} did not meet the full workflow criteria (${causeText}). This is an evaluation observation, not a confirmed product defect. Baseline result was ${before?.completeWorkflowSuccess?'complete':'incomplete'}.`,status:'draft' as const,requiresHumanReview:true as const,verifiedDefect:false as const,sourceReferences:{datasetVersion:P5D_DATASET_VERSION,datasetSha256:p5dDatasetSha256(dataset),testCaseId:c.id}};
 });
 const splits=['development','heldOut','all'] as const;
 const finalMetrics={development:aggregate(cases.filter(c=>c.split==='development')),heldOut:aggregate(cases.filter(c=>c.split==='held-out')),all:aggregate(cases)};
 const baselineComparison=Object.fromEntries(splits.map(key=>{const b=baseline.metrics[key],f=finalMetrics[key];return[key,{baselineCompleteWorkflowSuccess:b.completeWorkflowSuccess,finalCompleteWorkflowSuccess:f.completeWorkflowSuccess,baselineIntentExactMatch:b.intentExactMatch,finalIntentExactMatch:f.intentExactMatch,baselineConstraintRecall:b.constraintRecall,finalConstraintRecall:f.constraintRecall,baselineConstraintScopeAccuracy:b.constraintScopeAccuracy,finalConstraintScopeAccuracy:f.constraintScopeAccuracy,baselineNegationFlipRate:b.negationFlipRate,finalNegationFlipRate:f.negationFlipRate,baselineUnsupportedActionRate:b.unsupportedActionRate,finalUnsupportedActionRate:f.unsupportedActionRate,baselineEvidenceValidity:b.evidenceValidity,finalEvidenceValidity:f.evidenceValidity,baselineSafeRejection:b.safeRejectionRate,finalSafeRejection:f.safeRejectionRate,baselineFalseRejection:b.falseRejectionRate,finalFalseRejection:f.falseRejectionRate}]})) as P5DReport['baselineComparison'];
 return{schemaVersion:1,status:'SYNTHETIC_ONLY',mode:'final',datasetVersion:P5D_DATASET_VERSION,datasetSha256:p5dDatasetSha256(dataset),splitSeed:'codeswitch-p5d-split-2026-01',variantSeed:'codeswitch-p5d-perturb-2026-01',generatedAt:args.generatedAt??new Date().toISOString(),liveASR:false,counts:{originals:100,synthetic:300,total:400,development:cases.filter(c=>c.split==='development').length,heldOut:cases.filter(c=>c.split==='held-out').length},metrics:finalMetrics,baselineComparison,cases,p4gDrafts,limitations:['This is a deterministic text robustness evaluation on original synthetic instructions and explicitly labeled SYNTHETIC_ERROR_INJECTION variants. It is not a live ASR benchmark and variants are not Whisper outputs.','Only development-set outcomes were used to form draft P4G review proposals. Held-out outcomes were evaluated after the benchmark gate was fixed and were not used to tune it.','The final fail-closed layer is specific to benchmark cases and does not change or replace the existing P0 parser, validator, or P1 UI. It is a conservative rule gate, not general natural-language safety verification.','A negation deleted from the input may make it semantically affirmative. Text alone cannot reconstruct the source intent; such cases are separately labeled as unrecoverable input damage.','Safe rejection is not complete workflow success. Metrics use the denominators documented in the report.']};
}

export async function loadOrWriteP5DFixture(path=resolve('tests/fixtures/p5d-safety-v1.json')):Promise<P5DCase[]>{
 const generated=buildP5DDataset();
 try{const current=JSON.parse(await readFile(path,'utf8')) as P5DCase[];if(p5dDatasetSha256(current)!==p5dDatasetSha256(generated))throw new Error('Versioned P5D fixture differs from the generator. Refusing to overwrite Gold Labels.');return current;}
 catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;await writeFile(path,JSON.stringify(generated,null,2)+'\n');return generated;}
}

export function renderP5DMarkdown(r:P5DReport):string{
 const fmt=(x:Rate)=>`${x.numerator}/${x.denominator} (${x.value===null?'n/a':(x.value*100).toFixed(2)+'%'})`;
 const rows=(['development','heldOut','all'] as const).map(k=>{const a=r.metrics[k];return`| ${k} | ${a.originals} | ${a.synthetic} | ${fmt(a.intentExactMatch)} | ${fmt(a.constraintRecall)} | ${fmt(a.constraintScopeAccuracy)} | ${fmt(a.negationFlipRate)} | ${fmt(a.unsupportedActionRate)} | ${fmt(a.evidenceValidity)} | ${fmt(a.safeRejectionRate)} | ${fmt(a.falseRejectionRate)} | ${fmt(a.humanConfirmation)} | ${fmt(a.completeWorkflowSuccess)} |`;}).join('\n');
 const failures=r.cases.filter(c=>!c.completeWorkflowSuccess).map(c=>`- ${c.id} (${c.split}, ${c.kind}${c.mutation?`, ${c.mutation}`:''}): recall ${fmt(c.constraintRecall)}, scope ${fmt(c.constraintScopeAccuracy)}, unsupported ${fmt(c.unsupportedActions)}, safeReject=${c.safeRejection}, blocked=${c.blocked}${c.blockReasons.length?` [${c.blockReasons.join(', ')}]`:''}`).join('\n')||'- None';
 const proposals=r.p4gDrafts.length?`\n## P4G review drafts\n\n${r.p4gDrafts.map(p=>`- ${p.proposalId} — ${p.title}; source ${p.testCaseId}; status: draft, human review required, defect unverified.`).join('\n')}\n`:'\n## P4G review drafts\n\n- None generated in baseline mode.\n';
 const comparison=r.baselineComparison?`\n## Baseline vs final fail-closed pipeline\n\n| Split | Complete success baseline → final | Constraint recall baseline → final | Safe rejection baseline → final |\n| --- | --- | --- | --- |\n${(['development','heldOut','all'] as const).map(k=>{const c=r.baselineComparison![k];return`| ${k} | ${fmt(c.baselineCompleteWorkflowSuccess)} → ${fmt(c.finalCompleteWorkflowSuccess)} | ${fmt(c.baselineConstraintRecall)} → ${fmt(c.finalConstraintRecall)} | ${fmt(c.baselineSafeRejection)} → ${fmt(c.finalSafeRejection)} |`;}).join('\n')}\n`:'';
 return`# P5D ${r.mode==='baseline'?'Baseline':'Final'} Safety Evaluation\n\n- Dataset: ${r.datasetVersion}\n- Dataset SHA-256: ${r.datasetSha256}\n- Status: **${r.status}**; live ASR: **false**\n- Generated: ${r.generatedAt}\n- Splits: ${r.counts.development} development cases, ${r.counts.heldOut} held-out cases (parent variants stay in the parent split)\n- Cases: ${r.counts.originals} originals, ${r.counts.synthetic} ${'SYNTHETIC_ERROR_INJECTION'} variants\n\n## Metrics by split\n\nAll rates include numerator/denominator. Intent exact match is for the pipeline's accepted cards; raw parser intent exact match is separately recorded in JSON. Constraint recall and scope use gold constraints and raw proposals. Unsupported-action rate is measured on the parser proposal; accepted-card unsupported action is reported separately. Negation flip is measured on raw parser proposals; negationFlipPrevented counts flips blocked by the final gate. Evidence validity measures parser-proposed spans. Safe-rejection denominator is all synthetic variants expected to require rejection. False-rejection denominator is original cases labeled as draft. Human-confirmation denominator is accepted draft cards. Complete workflow denominator is original cases; safe rejection never counts as complete success.\n\n| Split | Originals | Synthetic | Intent exact | Constraint recall | Scope accuracy | Negation flip | Unsupported action | Evidence validity | Safe rejection | False rejection | Confirmation | Complete workflow |\n| --- | ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${rows}\n${comparison}\n## Failure cases\n\n${failures}\n\n## Outcome flags (overlapping counts)\n\n- Constraint recognized: ${r.metrics.all.outcomeCounts.constraintRecognized}\n- Safe rejected / unresolved: ${r.metrics.all.outcomeCounts.safeRejected}\n- Constraint missed: ${r.metrics.all.outcomeCounts.constraintMissed}\n- Incorrect or unsupported raw parser work card: ${r.metrics.all.outcomeCounts.incorrectWorkCard}\n- Negation-deletion input not recoverable from text: ${r.metrics.all.outcomeCounts.negationDeletionUnrecoverable}\n- Raw negation flips blocked by final gate: ${r.metrics.all.outcomeCounts.negationFlipPrevented}\n${proposals}\n## Limitations\n\n${r.limitations.map(x=>`- ${x}`).join('\n')}\n`;
}
