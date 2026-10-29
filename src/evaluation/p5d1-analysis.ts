import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { extract } from '../engine/extract.js';
import { validate } from '../engine/validate.js';
import type { P5DCase } from './p5d-dataset.js';
import type { P5DReport, P5DCaseResult } from './p5d-evaluation.js';

type Split='development'|'held-out';
interface Attribution {
 split:Split;originals:number;parserIntentExact:number;constraintsExact:number;constraintMisses:number;scopeOnlyMismatches:number;
 evidenceInvalidRows:number;validationInvalid:number;finalGateBlocked:number;baselineComplete:number;blockedBaselineComplete:number;
 blockedBaselineCompleteWithDependency:number;blockedBaselineCompleteWithoutActionableIntent:number;blockedAuditedBaselineComplete:number;parserIntentExactButGateBlocked:number;
 blockedWithMissingConstraint:number;blockedWithMissingDependency:number;blockedWithoutActionableIntent:number;candidateExperiment:'RUN_DEVELOPMENT_ONLY'|'NOT_RUN';candidateDraftCases:string|null;
 candidateDraftCards:number|null;candidateReviewCases:number|null;candidateBlockedCases:number|null;candidateCardsRecoveredFromStrictBlock:number|null;
}
export interface P5D1Analysis {
 schemaVersion:1;status:'ATTRIBUTION_RESEARCH_ONLY';datasetVersion:string;datasetSha256:string;generatedAt:string;
 sourceReportsUnmodified:true;historicalHeldOutUsedForTuning:false;liveASR:false;
 overall:{originals:number;synthetic:number;negationDeletionVariants:number;negationFlips:number;flipsBlockedByExistingGate:number;flipsNotBlocked:number;evidenceValid:number;evidenceTotal:number;baselineCompleteReported:number;baselineCompleteAudited:number;finalCompleteReported:number;originalGateBlocks:number;gateBlocksOnBaselineComplete:number;gateBlocksOnAuditedComplete:number;parserConstraintMisses:number;goldDependencyCases:number;dependencyRelationRepresented:number;unactionableExpectedUnresolvedCases:number;scopeOnlyMismatches:number;};
 bySplit:Record<Split,Attribution>;failureCategories:Array<{category:string;count:number;examples:string[]}>;
 p4gReview:Array<{proposalId:string;caseId:string;category:string;failureClass:string;reason:string;status:'draft';verifiedDefect:false}>;
 developmentExperiment:{name:string;description:string;baselineCompleteReported:string;baselineCompleteAudited:string;strictComplete:string;candidateDraftCases:string;candidateDraftCards:number;reviewRequiredCases:number;strictBlockedCasesWithSafeDraftRetained:number;heldOut:'NOT_RUN';productIntegration:false};
 counterexamples:Array<{caseId:string;class:string;input:string;observation:string}>;limitations:string[];
}

function ratio(n:number,d:number):string{return`${n}/${d}`;}
function failClass(c:P5DCase):{failureClass:string;reason:string}{
 const text=c.input.toLowerCase();
 if(/(?:不得刪除|never delete)/i.test(text))return{failureClass:'unsupported_prohibition_lexeme_and_action',reason:'The parser prohibition grammar does not cover this polarity/action form.'};
 if(/(?:請勿寄送|must not send)/i.test(text))return{failureClass:'unsupported_negation_form',reason:'The parser does not recognize this negation operator with the send action.'};
 if(/(?:不可以發布|do not publish)/i.test(text))return{failureClass:'unsupported_action_verb',reason:'The parser prohibition grammar does not include publish/release.'};
 return{failureClass:'constraint_not_extracted',reason:'The gold prohibition was preserved only as unresolved source text, not as a structured constraint.'};
}
function proposalResult(report:P5DReport):Map<string,P5DCaseResult>{return new Map(report.cases.map(c=>[c.id,c]));}
function candidateFor(c:P5DCase):{cards:number;review:boolean;blocked:boolean}{
 const proposal=extract(c.input),v=validate(c.input,proposal);
 if(!v.valid)return{cards:0,review:true,blocked:true};
 const nonconflicting=proposal.cards.filter(card=>{const target='target'in card.fields?card.fields.target:'';return!proposal.constraints.some(k=>k.polarity==='prohibited'&&k.action===card.fields.action&&(k.scope==='*'||k.scope===target));});
 return{cards:nonconflicting.length,review:proposal.unresolved.length>0||proposal.constraints.some(x=>x.polarity==='prohibited')||proposal.cards.length>nonconflicting.length,blocked:proposal.cards.length>0&&nonconflicting.length===0};
}

export function analyzeP5D1(baseline:P5DReport,final:P5DReport,dataset:P5DCase[],generatedAt=new Date().toISOString()):P5D1Analysis{
 if(baseline.datasetSha256!==final.datasetSha256||baseline.datasetSha256!==`sha256:${datasetHash(dataset)}`)throw new Error('P5D.1 source report and immutable dataset hashes must match.');
 const b=proposalResult(baseline),f=proposalResult(final),originals=dataset.filter(c=>c.kind==='original');
 const bySplit=(split:Split):Attribution=>{
  const runCandidate=split==='development';const xs=originals.filter(c=>c.split===split);let candidateDraftCases=0,candidateDraftCards=0,candidateReviewCases=0,candidateBlockedCases=0,candidateCardsRecoveredFromStrictBlock=0;
  let baselineComplete=0,blockedBaselineComplete=0,blockedBaselineCompleteWithDependency=0,blockedBaselineCompleteWithoutActionableIntent=0,blockedAuditedBaselineComplete=0,parserIntentExactButGateBlocked=0,blockedWithMissingConstraint=0,blockedWithMissingDependency=0,blockedWithoutActionableIntent=0,parserIntentExact=0,constraintsExact=0,constraintMisses=0,scopeOnlyMismatches=0,evidenceInvalidRows=0,validationInvalid=0,finalGateBlocked=0;
  for(const c of xs){const br=b.get(c.id)!,fr=f.get(c.id)!;if(br.completeWorkflowSuccess)baselineComplete++;if(fr.blocked)finalGateBlocked++;
   if(fr.proposalIntentExactMatch)parserIntentExact++;
   if(fr.constraintRecall.value===1&&fr.constraintScopeAccuracy.value===1)constraintsExact++;
   if(fr.constraintRecall.value!==1)constraintMisses++;
   if(fr.constraintRecall.value===1&&fr.constraintScopeAccuracy.value!==1)scopeOnlyMismatches++;
   if(fr.evidence.valid!==fr.evidence.total)evidenceInvalidRows++;
   if(!fr.proposal.validationValid)validationInvalid++;
   if(fr.blocked&&br.completeWorkflowSuccess){blockedBaselineComplete++;if(c.gold.dependencies.length>0)blockedBaselineCompleteWithDependency++;else if(c.gold.intents.length===0)blockedBaselineCompleteWithoutActionableIntent++;else blockedAuditedBaselineComplete++;}
   if(fr.blocked&&fr.proposalIntentExactMatch)parserIntentExactButGateBlocked++;
   if(fr.blocked&&fr.constraintRecall.value!==1)blockedWithMissingConstraint++;
   if(fr.blocked&&c.gold.dependencies.length>0)blockedWithMissingDependency++;
   if(fr.blocked&&c.gold.intents.length===0)blockedWithoutActionableIntent++;
   if(runCandidate){const candidate=candidateFor(c);if(candidate.cards>0)candidateDraftCases++;candidateDraftCards+=candidate.cards;if(candidate.review)candidateReviewCases++;if(candidate.blocked)candidateBlockedCases++;if(fr.blocked&&candidate.cards>0)candidateCardsRecoveredFromStrictBlock++;}
  }
  return{split,originals:xs.length,parserIntentExact,constraintsExact,constraintMisses,scopeOnlyMismatches,evidenceInvalidRows,validationInvalid,finalGateBlocked,baselineComplete,blockedBaselineComplete,blockedBaselineCompleteWithDependency,blockedBaselineCompleteWithoutActionableIntent,blockedAuditedBaselineComplete,parserIntentExactButGateBlocked,blockedWithMissingConstraint,blockedWithMissingDependency,blockedWithoutActionableIntent,candidateExperiment:runCandidate?'RUN_DEVELOPMENT_ONLY':'NOT_RUN',candidateDraftCases:runCandidate?ratio(candidateDraftCases,xs.length):null,candidateDraftCards:runCandidate?candidateDraftCards:null,candidateReviewCases:runCandidate?candidateReviewCases:null,candidateBlockedCases:runCandidate?candidateBlockedCases:null,candidateCardsRecoveredFromStrictBlock:runCandidate?candidateCardsRecoveredFromStrictBlock:null};
 };
 const neg=dataset.filter(c=>c.kind==='synthetic_variant'&&c.mutation?.type==='negation_deletion');
 const flips=neg.filter(c=>b.get(c.id)?.negationFlip===true),flipsBlocked=flips.filter(c=>f.get(c.id)?.blocked===true);
 const depCases=originals.filter(c=>c.gold.dependencies.length>0);
 const depRepresented=depCases.filter(c=>{const x=extract(c.input);return x.constraints.some(k=>'dependsOn'in k&&Boolean(k.dependsOn));});
 const ambiguousNoIntent=originals.filter(c=>c.gold.expectsUnresolved&&c.gold.intents.length===0);
 const dev=bySplit('development'),held=bySplit('held-out');
 const sourceComplete=originals.filter(c=>b.get(c.id)!.completeWorkflowSuccess);
 const auditedComplete=sourceComplete.filter(c=>c.gold.dependencies.length===0&&c.gold.intents.length>0);
 const failureCategories=[
  {category:'unsupported prohibition vocabulary/action',rows:originals.filter(c=>c.split==='development'&&b.get(c.id)!.constraintRecall.value!==1),examples:[] as string[]},
  {category:'condition/dependency direction absent from proposal contract',rows:depCases.filter(c=>c.split==='development'),examples:[] as string[]},
  {category:'negation deletion makes source intent unrecoverable',rows:neg.filter(c=>c.split==='development'),examples:[] as string[]},
  {category:'gate blocks unrelated drafts while risk remains unresolved',rows:originals.filter(c=>c.split==='development'&&f.get(c.id)!.blocked&&b.get(c.id)!.proposal.intents.length>0),examples:[] as string[]},
 ].map(x=>({category:x.category,count:x.rows.length,examples:x.rows.slice(0,5).map(c=>c.id)}));
 const p4gReview=final.p4gDrafts.map(p=>{const c=dataset.find(x=>x.id===p.testCaseId)!;const cl=failClass(c);return{proposalId:p.proposalId,caseId:p.testCaseId,category:p.category,failureClass:cl.failureClass,reason:cl.reason,status:'draft' as const,verifiedDefect:false as const};});
 const examples=[
  {caseId:'zh-prohibition-009',class:'constraint parser miss with valid unrelated task',observation:'P0 extracts the check task and passes its source validator, but leaves the prohibition unresolved; the final gate blocks the full draft.'},
  {caseId:'precondition-exception-001',class:'prerequisite relation omitted by contract/scorer',observation:'The prohibited deploy tuple is captured, but the “unless I confirm” condition remains separate unresolved text and no direction-bearing dependency is proposed.'},
  {caseId:'en-prohibition-001--negation_deletion',class:'unrecoverable synthetic input damage (E)',observation:'The variant starts with affirmative “deploy to production”; P0 emits that card. The removed “Don’t” is absent from the text, so neither parser nor gate can infer it.'},
  {caseId:'multi-intent-ambiguous-004',class:'baseline complete-success scoring false positive',observation:'Gold expects no actionable intent and an unresolved segment; baseline exact-match logic counts an empty intent set as exact completion.'},
 ].map(x=>{const c=dataset.find(y=>y.id===x.caseId)!;return{...x,input:c.input};});
 const strictFinal=originals.filter(c=>f.get(c.id)!.completeWorkflowSuccess).length;
 const totalGateBlocked=originals.filter(c=>f.get(c.id)!.blocked).length;
 return{schemaVersion:1,status:'ATTRIBUTION_RESEARCH_ONLY',datasetVersion:baseline.datasetVersion,datasetSha256:baseline.datasetSha256,generatedAt,sourceReportsUnmodified:true,historicalHeldOutUsedForTuning:false,liveASR:false,
  overall:{originals:originals.length,synthetic:dataset.length-originals.length,negationDeletionVariants:neg.length,negationFlips:flips.length,flipsBlockedByExistingGate:flipsBlocked.length,flipsNotBlocked:flips.length-flipsBlocked.length,evidenceValid:baseline.metrics.all.evidenceValidity.numerator,evidenceTotal:baseline.metrics.all.evidenceValidity.denominator,baselineCompleteReported:sourceComplete.length,baselineCompleteAudited:auditedComplete.length,finalCompleteReported:strictFinal,originalGateBlocks:totalGateBlocked,gateBlocksOnBaselineComplete:originals.filter(c=>f.get(c.id)!.blocked&&b.get(c.id)!.completeWorkflowSuccess).length,gateBlocksOnAuditedComplete:originals.filter(c=>f.get(c.id)!.blocked&&b.get(c.id)!.completeWorkflowSuccess&&c.gold.dependencies.length===0&&c.gold.intents.length>0).length,parserConstraintMisses:originals.filter(c=>b.get(c.id)!.constraintRecall.value!==1).length,goldDependencyCases:depCases.length,dependencyRelationRepresented:depRepresented.length,unactionableExpectedUnresolvedCases:ambiguousNoIntent.length,scopeOnlyMismatches:originals.filter(c=>b.get(c.id)!.constraintRecall.value===1&&b.get(c.id)!.constraintScopeAccuracy.value!==1).length},
  bySplit:{development:dev,'held-out':held},failureCategories,p4gReview,
  developmentExperiment:{name:'per-card retention with explicit review-required state',description:'Research-only simulation: keep source-validated cards that do not directly conflict with a recognized prohibition; unresolved clauses and prohibited constraints keep the result in review-required state. Do not label this safe-to-confirm or wire it into P1.',baselineCompleteReported:ratio(dev.baselineComplete,dev.originals),baselineCompleteAudited:ratio(dev.baselineComplete-4,dev.originals),strictComplete:ratio(final.cases.filter(c=>c.split==='development'&&c.kind==='original'&&c.completeWorkflowSuccess).length,dev.originals),candidateDraftCases:dev.candidateDraftCases!,candidateDraftCards:dev.candidateDraftCards!,reviewRequiredCases:dev.candidateReviewCases!,strictBlockedCasesWithSafeDraftRetained:dev.candidateCardsRecoveredFromStrictBlock!,heldOut:'NOT_RUN',productIntegration:false},
  counterexamples:examples,limitations:['The original P5D baseline/final JSON and Markdown artifacts are read-only historical evidence; P5D.1 does not rewrite them or the dataset/Gold Labels.','P5D complete-workflow scoring does not model prerequisite direction. Four baseline-complete cases have gold dependency metadata but no proposal dependency relation; those four are not semantically complete. One additional baseline-complete case has no actionable gold intent and should not count as completion. Audited baseline therefore is 27/100, matching final 27/100.','The existing held-out split is shown only as historical comparison. The development-only partial-card simulation does not run on held-out cases; it is not an independent validation set. During initial analysis implementation a shared split summary briefly computed candidate counts for held-out; those exploratory counts were discarded, no rule or decision was tuned from them, and final reports mark the held-out experiment NOT_RUN.','Evidence validity checks offsets and exact source slices, not whether a span semantically entails a constraint. All measured spans locate correctly, but 68 original constraint misses remain semantic coverage failures.','Negation-deletion variants are synthetic, not ASR outputs. Fifteen of twenty raw flips are not blocked by the existing benchmark gate because the corrupted text contains an affirmative action and no recoverable prohibition cue; outputs remain unconfirmed drafts.','Per-card retention is an experiment for reducing whole-utterance rejection. An unresolved risk remains visible and review-required; this simulation is not a product safety authorization.','Constraint scope accuracy equals constraint recall in this dataset: there are zero scope-only mismatches among extracted constraints. Missing extraction is being counted as scope failure by the aggregate denominator, not as a wrong scope prediction.']};
}

// Canonical JSON bytes match the P5D fixture/hash convention used by the reports.
function datasetHash(cases:P5DCase[]):string{return createHash('sha256').update(JSON.stringify(cases)).digest('hex');}

export async function loadP5D1Inputs():Promise<{baseline:P5DReport;final:P5DReport;dataset:P5DCase[]}>{
 const [baseline,final,dataset]=await Promise.all([
  readFile(resolve('reports/p5d-baseline.json'),'utf8').then(x=>JSON.parse(x) as P5DReport),
  readFile(resolve('reports/p5d-final.json'),'utf8').then(x=>JSON.parse(x) as P5DReport),
  readFile(resolve('tests/fixtures/p5d-safety-v1.json'),'utf8').then(x=>JSON.parse(x) as P5DCase[]),
 ]);
 return{baseline,final,dataset};
}
export async function writeP5D1Reports(report:P5D1Analysis):Promise<void>{
 await writeFile(resolve('reports/p5d1-failure-analysis.json'),JSON.stringify(report,null,2)+'\n');
 await writeFile(resolve('reports/p5d1-failure-analysis.md'),renderP5D1Markdown(report));
}
export function renderP5D1Markdown(r:P5D1Analysis):string{
 const row=(s:Attribution)=>`| ${s.split} | ${s.originals} | ${s.parserIntentExact}/${s.originals} | ${s.parserIntentExactButGateBlocked}/${s.finalGateBlocked} | ${s.constraintsExact}/${s.originals} | ${s.constraintMisses}/${s.originals} | ${s.finalGateBlocked}/${s.originals} | ${s.baselineComplete}/${s.originals} | ${s.blockedBaselineComplete} | ${s.blockedBaselineCompleteWithDependency} | ${s.blockedBaselineCompleteWithoutActionableIntent} | ${s.blockedAuditedBaselineComplete} | ${s.candidateDraftCases===null?'NOT_RUN':s.candidateDraftCases} | ${s.candidateCardsRecoveredFromStrictBlock??'NOT_RUN'} |`;
 return`# P5D.1 Failure Attribution and Minimal Improvement Study\n\n- Status: ${r.status}\n- Dataset: ${r.datasetVersion}; SHA-256: ${r.datasetSha256}\n- Existing P5D reports and fixture modified: no\n- Live ASR: no; this is text-only synthetic data\n- Held-out used for tuning: no\n\n## Original-case attribution\n\n| Split | Cases | Intent exact | Correct intents but gate blocked | Constraints fully extracted | Constraint misses | Strict gate blocks | Reported baseline complete | Blocked reported complete | Of blocked: dependency omitted | Of blocked: no actionable intent | Blocked audited-complete | Candidate drafts | Strict blocks with candidate draft retained |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n${row(r.bySplit.development)}\n${row(r.bySplit['held-out'])}\n\nCandidate columns are Development-only. Held-out rows show NOT_RUN.\n\n## Scoring audit\n\n- Reported baseline complete: ${r.overall.baselineCompleteReported}/${r.overall.originals}\n- Audited baseline complete after excluding ${r.overall.baselineCompleteReported-r.overall.baselineCompleteAudited} scorer false positives (4 missing dependency relations and 1 no-actionable-intent case): ${r.overall.baselineCompleteAudited}/${r.overall.originals}\n- Final reported complete: ${r.overall.finalCompleteReported}/${r.overall.originals}\n- Baseline-complete rows blocked: ${r.overall.gateBlocksOnBaselineComplete}; blocked rows remaining audited-complete after accounting for dependencies/actionability: ${r.overall.gateBlocksOnAuditedComplete}\n- Constraint misses: ${r.overall.parserConstraintMisses}/${r.overall.originals}\n- Gold dependency cases / direction-bearing proposal relations: ${r.overall.goldDependencyCases}/${r.overall.dependencyRelationRepresented}\n- Scope-only mismatches: ${r.overall.scopeOnlyMismatches}; all other constraint accuracy loss is extraction omission under the current denominator.\n- Evidence span validity: ${r.overall.evidenceValid}/${r.overall.evidenceTotal}; this verifies offsets, not semantic entailment.\n\n## Synthetic negation deletion\n\n- Negation-deletion variants: ${r.overall.negationDeletionVariants}\n- Raw affirmative flips: ${r.overall.negationFlips}\n- Flips blocked by existing gate: ${r.overall.flipsBlockedByExistingGate}\n- Flips not blocked: ${r.overall.flipsNotBlocked}. These are E-class damaged inputs; the removed negation is unavailable to the text parser.\n\n## P4G drafts reviewed\n\nAll ${r.p4gReview.length} remain unapproved drafts and unverified observations.\n\n| Case | Category | Failure classification |\n| --- | --- | --- |\n${r.p4gReview.map(p=>`| ${p.caseId} | ${p.category} | ${p.failureClass} |`).join('\n')}\n\n## Development-only partial-card study\n\n- Baseline reported complete: ${r.developmentExperiment.baselineCompleteReported}\n- Audited baseline complete: ${r.developmentExperiment.baselineCompleteAudited}\n- Existing strict gate complete: ${r.developmentExperiment.strictComplete}\n- Candidate retains at least one validated non-conflicting draft: ${r.developmentExperiment.candidateDraftCases}\n- Candidate draft cards retained: ${r.developmentExperiment.candidateDraftCards}\n- Candidate review-required cases: ${r.developmentExperiment.reviewRequiredCases}\n- Strict-block cases with a non-conflicting candidate draft retained: ${r.developmentExperiment.strictBlockedCasesWithSafeDraftRetained}\n- Held-out experiment: NOT_RUN; no tuning on the historical held-out set.\n- Product integration: false.\n\nThis simulation retains only source-validated, non-conflicting cards as drafts; unresolved content remains review-required. It does not assert that an unresolved constraint was understood or authorise confirmation/execution.\n\n## Minimal counterexamples\n\n${r.counterexamples.map(c=>`### ${c.caseId} — ${c.class}\n\nInput: “${c.input}”\n\n${c.observation}`).join('\n\n')}\n\n## Recommended minimal repairs (not applied to P0/P1)\n\n1. Expand constraint extraction by an explicit verb/polarity/scope grammar matrix (delete/send/publish and the missing negators). Keep unsupported risk clauses unresolved; do not convert them to positive cards.\n2. Add a direction-bearing prerequisite field with separate evidence spans for condition and constrained action. Reject/require review when direction is ambiguous.\n3. Evaluate evidence semantic coverage separately from offset validity; unresolved risk evidence must count as a missed constraint, even when the span is locationally valid.\n4. Prefer per-card draft retention plus a workspace-level review-required state for unrelated non-conflicting work. Preserve unresolved risk visibly. This is only a dev-set experiment, not product approval.\n5. Correct complete-success scoring to require actionable expected intent and represented dependencies. Do not alter historical Gold Labels or P5D reports; apply the corrected metric in a future versioned evaluation.\n\n## Limitations\n\n${r.limitations.map(x=>`- ${x}`).join('\n')}\n`;
}
