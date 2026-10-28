import { expect, it } from 'vitest';
import { createWorkspace, EXAMPLE } from '../../src/web/state/workspace.js';
import { addTestNote, createFeedback, proposeImprovement, resetImportedFeedback, transitionImprovement, validateFeedbackCollections } from '../../src/web/feedback/model.js';

const record={id:'12345678-1234-4234-8234-123456789abc',workspace:createWorkspace(EXAMPLE),audioMetadata:null,asrMetadata:null};
const feedback=()=>createFeedback(record,{rating:'bad',category:'speech_recognition',originalFeedback:"The transcript missed 'don't deploy to production'.",userExpectedResult:"Keep don't deploy to production in the transcript.",relatedWorkCardIds:['card-2']});

it('creates linked feedback with source evidence, related cards and optional metadata without mutating the workspace',()=>{
  const value=feedback();
  expect(value).toMatchObject({workspaceId:record.id,sessionId:record.id,rating:'bad',category:'speech_recognition',status:'open',relatedWorkCardIds:['card-2'],provider:null});
  expect(value.provenance.sourceEvidence).toEqual([record.workspace.cards[1]!.current.evidence]);
  expect(validateFeedbackCollections(record.id,record.workspace,{feedbacks:[value],proposals:[],improvementSessions:[]}).feedbacks).toHaveLength(1);
  expect(record.workspace.cards).toHaveLength(3);
});

it('deterministically proposes review criteria for a reported missed prohibition without claiming a verified defect',()=>{
  const source=feedback(),{proposal,session}=proposeImprovement(source);
  expect(proposal).toMatchObject({status:'draft',priority:'high',feedbackIds:[source.feedbackId],title:'Investigate missing negative instructions in ASR output'});
  expect(proposal.problemStatement).toContain('not a verified defect');
  expect(proposal.suggestedAcceptanceCriteria).toEqual(expect.arrayContaining(['Compare raw and user-corrected transcripts for the reported prohibition.','Verify constraint extraction against the preserved transcript.']));
  expect(session.status).toBe('draft');
  expect(()=>transitionImprovement(session,'testing')).toThrow(/Invalid improvement transition/);
});

it('uses a conservative generic proposal for ordinary feedback without inventing reproduction steps',()=>{
  const ordinary=createFeedback(record,{rating:'mixed',category:'intent_extraction',originalFeedback:'The parser missed the second request.',actualResult:'One card appeared.',relatedWorkCardIds:['card-2']});
  const {proposal}=proposeImprovement(ordinary);
  expect(proposal).toMatchObject({priority:'medium',status:'draft',title:'Review intent extraction feedback'});
  expect(proposal.problemStatement).toContain('not a verified defect');
  expect(proposal.expectedBehavior).toContain('Review the intent extraction feedback');
  expect(proposal.suggestedAcceptanceCriteria.join(' ')).not.toMatch(/reproduced|test passed/i);
});

it('requires human approval, tracks lifecycle transitions and keeps test notes explicitly unverified',()=>{
  const {session}=proposeImprovement(feedback());
  const approved=transitionImprovement(session,'approved','owner reviewed proposal');
  const doing=transitionImprovement(approved,'in_progress');
  const testing=transitionImprovement(doing,'testing');
  const noted=addTestNote(testing,'Regression test run locally.','commit abc; result not attached');
  expect(noted.testNotes[0]).toMatchObject({verification:'user-reported-unverified'});
  const resolved=transitionImprovement(noted,'resolved');
  expect(transitionImprovement(resolved,'reopened').status).toBe('reopened');
  expect(()=>transitionImprovement(session,'approved')).not.toThrow();
});

it('rejects altered evidence and resets imported approval/resolution state',()=>{
  const source=feedback(),{proposal,session}=proposeImprovement(source);
  const collections={feedbacks:[source],proposals:[{...proposal,status:'approved' as const}],improvementSessions:[{...session,status:'resolved' as const}]};
  expect(()=>validateFeedbackCollections(record.id,record.workspace,{...collections,improvementSessions:[{...collections.improvementSessions[0]!,status:'rejected'}]})).toThrow(/review state/);
  const tampered={...source,provenance:{...source.provenance,sourceEvidence:[{...source.provenance.sourceEvidence[0]!,text:'forged'}]}};
  expect(()=>validateFeedbackCollections(record.id,record.workspace,{feedbacks:[tampered],proposals:[],improvementSessions:[]})).toThrow(/tampered feedback/);
  validateFeedbackCollections(record.id,record.workspace,collections);
  const imported=resetImportedFeedback({feedbacks:[source],proposals:collections.proposals,improvementSessions:collections.improvementSessions},record.id,'87654321-4321-4321-8321-cba987654321');
  expect(imported.feedbacks[0]).toMatchObject({workspaceId:'87654321-4321-4321-8321-cba987654321',status:'open'});
  expect(imported.proposals[0]?.status).toBe('draft');expect(imported.improvementSessions[0]?.status).toBe('draft');
});

it('rejects unsupported rating/category values and preserves an empty optional comment',()=>{
  const empty=createFeedback(record,{rating:'good',category:'user_experience',originalFeedback:'',relatedWorkCardIds:[]});
  expect(empty.originalFeedback).toBe('');
  expect(()=>validateFeedbackCollections(record.id,record.workspace,{feedbacks:[{...empty,category:'bug' as never}],proposals:[],improvementSessions:[]})).toThrow(/tampered feedback/);
  expect(()=>validateFeedbackCollections(record.id,record.workspace,{feedbacks:[{...empty,rating:'excellent' as never}],proposals:[],improvementSessions:[]})).toThrow(/tampered feedback/);
});
