import { describe, expect, it } from 'vitest';
import { buildP5DDataset } from '../../src/evaluation/p5d-dataset.js';
import { buildP5DBaselineReport, buildP5DFinalReport } from '../../src/evaluation/p5d-evaluation.js';
import { analyzeP5D1 } from '../../src/evaluation/p5d1-analysis.js';

function run(){const data=buildP5DDataset();return{data,report:analyzeP5D1(buildP5DBaselineReport({generatedAt:'fixture'}),buildP5DFinalReport({generatedAt:'fixture'}),data,'fixture')}}
describe('P5D.1 failure attribution',()=>{
 it('audits scorer false positives without changing P5D reports or Gold Labels',()=>{
  const {data,report}=run();
  expect(report.sourceReportsUnmodified).toBe(true);expect(report.datasetSha256).toBe('sha256:696f86d9865e5aecace2bab0d01c09d0b5b2d7e49195e7c1b4c110c0e7a1a86a');
  expect(report.overall).toMatchObject({baselineCompleteReported:32,baselineCompleteAudited:27,finalCompleteReported:27,goldDependencyCases:20,dependencyRelationRepresented:0,unactionableExpectedUnresolvedCases:5,scopeOnlyMismatches:0});
  expect(data).toHaveLength(400);
 });
 it('separates missing constraints from avoidable blocking of correct proposals',()=>{
  const {report}=run();
  expect(report.overall.parserConstraintMisses).toBe(68);
  expect(report.bySplit.development).toMatchObject({constraintMisses:39,blockedWithMissingConstraint:39,blockedBaselineComplete:4});
  expect(report.bySplit['held-out']).toMatchObject({constraintMisses:29,blockedWithMissingConstraint:29,blockedBaselineComplete:1});
  expect(report.developmentExperiment.heldOut).toBe('NOT_RUN');
 });
 it('classifies deleted-negation cases as irrecoverable text damage and reports interception separately',()=>{
  const {report}=run();
  expect(report.overall).toMatchObject({negationDeletionVariants:100,negationFlips:20,flipsBlockedByExistingGate:5,flipsNotBlocked:15});
 });
 it('audits the twelve P4G drafts as unapproved, categorized review items',()=>{
  const {report}=run();
  expect(report.p4gReview).toHaveLength(12);
  expect(report.p4gReview.every(x=>x.status==='draft'&&!x.verifiedDefect)).toBe(true);
  expect(report.p4gReview.filter(x=>x.failureClass==='unsupported_prohibition_lexeme_and_action')).toHaveLength(4);
  expect(report.p4gReview.filter(x=>x.failureClass==='unsupported_negation_form')).toHaveLength(5);
  expect(report.p4gReview.filter(x=>x.failureClass==='unsupported_action_verb')).toHaveLength(3);
 });
 it('limits the partial-draft experiment to Development and requires review',()=>{
  const {report}=run();const x=report.developmentExperiment;
  expect(x.productIntegration).toBe(false);expect(x.heldOut).toBe('NOT_RUN');
  expect(x.candidateDraftCases).toBe('60/60');expect(x.reviewRequiredCases).toBe(60);
  expect(x.strictBlockedCasesWithSafeDraftRetained).toBeGreaterThan(0);
  expect(report.bySplit['held-out'].candidateExperiment).toBe('NOT_RUN');
  expect(report.bySplit['held-out'].candidateDraftCases).toBeNull();
 });
});
