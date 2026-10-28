import type { Evidence } from '../../contracts/work-card.js';
import type { Workspace } from '../state/workspace.js';

export const FEEDBACK_CATEGORIES = ['speech_recognition','intent_extraction','missing_constraint','incorrect_work_card','user_experience','performance','feature_request','other'] as const;
export type FeedbackCategory = typeof FEEDBACK_CATEGORIES[number];
export type FeedbackRating = 'good' | 'mixed' | 'bad';
export type FeedbackStatus = 'open' | 'converted';
export type ImprovementPriority = 'low' | 'medium' | 'high';
export type ImprovementProposalStatus = 'draft' | 'approved' | 'rejected';
export type ImprovementStatus = 'draft' | 'approved' | 'in_progress' | 'testing' | 'resolved' | 'reopened' | 'rejected';

export interface FeedbackProvider { providerId: string; modelId: string; runtime: string | null; executionMode: 'live' | 'mock' | 'unknown' }
export interface FeedbackRecord {
  schemaVersion: 1; feedbackId: string; workspaceId: string; sessionId: string; createdAt: string; updatedAt: string;
  rating: FeedbackRating; category: FeedbackCategory; originalFeedback: string; userExpectedResult: string | null; actualResult: string | null;
  relatedWorkCardIds: string[]; relatedAudioSHA: string | null; provider: FeedbackProvider | null; status: FeedbackStatus;
  provenance: { workspaceId: string; sessionId: string; sourceEvidence: Evidence[] };
  history: { at: string; field: string; before: string | null; after: string | null }[];
}
export interface ImprovementProposal {
  schemaVersion: 1; proposalId: string; workspaceId: string; feedbackIds: string[]; title: string; problemStatement: string;
  expectedBehavior: string; suggestedAcceptanceCriteria: string[]; priority: ImprovementPriority; status: ImprovementProposalStatus;
  createdAt: string; updatedAt: string; sourceReferences: string[]; history: { at: string; field: string; before: string | null; after: string | null }[];
}
export interface ImprovementSession {
  schemaVersion: 1; sessionId: string; workspaceId: string; proposalId: string; feedbackIds: string[]; title: string;
  problemStatement: string; expectedBehavior: string; suggestedAcceptanceCriteria: string[]; priority: ImprovementPriority;
  status: ImprovementStatus; createdAt: string; updatedAt: string; sourceReferences: string[];
  history: { at: string; from: ImprovementStatus; to: ImprovementStatus; note: string | null }[];
  testNotes: { createdAt: string; summary: string; evidence: string | null; verification: 'user-reported-unverified' }[];
}
export interface FeedbackInput { rating: FeedbackRating; category: FeedbackCategory; originalFeedback: string; userExpectedResult?: string; actualResult?: string; relatedWorkCardIds: string[] }
export interface FeedbackCollections { feedbacks: FeedbackRecord[]; proposals: ImprovementProposal[]; improvementSessions: ImprovementSession[] }

const uuid = () => crypto.randomUUID();
const isDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
const exact = (value: object, keys: string[]) => Object.keys(value).every(key => keys.includes(key)) && keys.every(key => Object.hasOwn(value, key));
const safeText = (value: unknown, limit = 10_000): value is string => typeof value === 'string' && value.length <= limit;
const validEvidence = (input: string, span: Evidence): boolean => Number.isInteger(span.start) && Number.isInteger(span.end) && span.start >= 0 && span.end > span.start && span.end <= input.length && input.slice(span.start, span.end) === span.text;

export function createFeedback(record: { id: string; workspace: Workspace; audioMetadata: { sha256: string } | null; asrMetadata: { providerId: string; modelId: string; runtime: { runtime: string } | null; executionMode: 'live' | 'mock' | 'unknown' } | null }, value: FeedbackInput): FeedbackRecord {
  const cardIds = new Set(record.workspace.cards.map(card => card.id));
  if (value.relatedWorkCardIds.some(id => !cardIds.has(id))) throw new Error('Feedback references a work card outside this workspace.');
  const selected = record.workspace.cards.filter(card => value.relatedWorkCardIds.includes(card.id)).map(card => card.current.evidence);
  const sourceEvidence = selected.length ? selected : [{ text: record.workspace.originalInput, start: 0, end: record.workspace.originalInput.length }];
  const now = new Date().toISOString();
  return {
    schemaVersion: 1, feedbackId: uuid(), workspaceId: record.id, sessionId: record.id, createdAt: now, updatedAt: now,
    rating: value.rating, category: value.category, originalFeedback: value.originalFeedback.trim(), userExpectedResult: value.userExpectedResult?.trim() || null,
    actualResult: value.actualResult?.trim() || null, relatedWorkCardIds: [...value.relatedWorkCardIds], relatedAudioSHA: record.audioMetadata?.sha256 ?? null,
    provider: record.asrMetadata ? { providerId: record.asrMetadata.providerId, modelId: record.asrMetadata.modelId, runtime: record.asrMetadata.runtime?.runtime ?? null, executionMode: record.asrMetadata.executionMode } : null, status: 'open',
    provenance: { workspaceId: record.id, sessionId: record.id, sourceEvidence }, history: [],
  };
}
const negatedDeploy = /(?:don't|do not|cannot|can't|never|不要|不能|不得|尚未)\s*(?:deploy|send|delete|publish|release|執行|部署|寄出|刪除|發布)/i;

export function proposeImprovement(feedback: FeedbackRecord): { proposal: ImprovementProposal; session: ImprovementSession } {
  const categoryLabels: Record<FeedbackCategory, string> = {
    speech_recognition: 'speech recognition', intent_extraction: 'intent extraction', missing_constraint: 'constraint preservation',
    incorrect_work_card: 'work card generation', user_experience: 'user experience', performance: 'runtime performance', feature_request: 'requested capability', other: 'reported workflow',
  };
  const negationIssue = feedback.category === 'speech_recognition' && negatedDeploy.test(feedback.originalFeedback);
  const title = negationIssue ? 'Investigate missing negative instructions in ASR output' : `Review ${categoryLabels[feedback.category]} feedback`;
  const problemStatement = `User-reported feedback (not a verified defect): ${feedback.originalFeedback || `Rating: ${feedback.rating}; no written description was provided.`}`;
  const expectedBehavior = feedback.userExpectedResult || (negationIssue
    ? 'Preserve the prohibition in the transcript and keep it available to constraint extraction for review.'
    : `Review the ${categoryLabels[feedback.category]} feedback with the source session before deciding on a change.`);
  const criteria = negationIssue
    ? ['Compare raw and user-corrected transcripts for the reported prohibition.', 'Verify constraint extraction against the preserved transcript.', 'Add a regression test using authorized test data.']
    : [`Review the original feedback and linked source evidence.`, `Define expected behavior for ${categoryLabels[feedback.category]} without assuming the report is a confirmed defect.`, 'Add a regression test using authorized test data if investigation confirms a reproducible issue.'];
  const now = new Date().toISOString(), priority: ImprovementPriority = feedback.rating === 'bad' ? 'high' : feedback.rating === 'mixed' ? 'medium' : 'low';
  const sourceReferences = [`feedback:${feedback.feedbackId}`, ...feedback.relatedWorkCardIds.map(id => `work-card:${id}`), ...(feedback.relatedAudioSHA ? [`audio:${feedback.relatedAudioSHA}`] : [])];
  const proposal: ImprovementProposal = { schemaVersion: 1, proposalId: uuid(), workspaceId: feedback.workspaceId, feedbackIds: [feedback.feedbackId], title, problemStatement, expectedBehavior, suggestedAcceptanceCriteria: criteria, priority, status: 'draft', createdAt: now, updatedAt: now, sourceReferences, history: [] };
  const session: ImprovementSession = { schemaVersion: 1, sessionId: uuid(), workspaceId: feedback.workspaceId, proposalId: proposal.proposalId, feedbackIds: [...proposal.feedbackIds], title, problemStatement, expectedBehavior, suggestedAcceptanceCriteria: [...criteria], priority, status: 'draft', createdAt: now, updatedAt: now, sourceReferences: [...sourceReferences], history: [], testNotes: [] };
  return { proposal, session };
}

export function updateProposal(proposal: ImprovementProposal, patch: Partial<Pick<ImprovementProposal, 'title'|'problemStatement'|'expectedBehavior'|'suggestedAcceptanceCriteria'|'priority'>>): ImprovementProposal {
  if (proposal.status !== 'draft') throw new Error('Only a draft proposal can be edited.');
  const next = { ...proposal, ...patch, updatedAt: new Date().toISOString(), history: [...proposal.history] };
  for (const field of ['title','problemStatement','expectedBehavior','suggestedAcceptanceCriteria','priority'] as const) {
    if (patch[field] === undefined) continue;
    const before = proposal[field], after = patch[field];
    if (JSON.stringify(before) !== JSON.stringify(after)) next.history.push({ at: next.updatedAt, field, before: Array.isArray(before) ? before.join('\n') : String(before), after: Array.isArray(after) ? after.join('\n') : String(after) });
  }
  return next;
}

const TRANSITIONS: Record<ImprovementStatus, ImprovementStatus[]> = {
  draft: ['approved','rejected'], approved: ['in_progress','rejected'], in_progress: ['testing','reopened','rejected'],
  testing: ['resolved','in_progress','reopened'], resolved: ['reopened'], reopened: ['in_progress','testing','rejected'], rejected: [],
};
export function availableImprovementTransitions(status: ImprovementStatus): ImprovementStatus[] { return [...TRANSITIONS[status]]; }
export function transitionImprovement(session: ImprovementSession, status: ImprovementStatus, note: string | null = null): ImprovementSession {
  if (!TRANSITIONS[session.status].includes(status)) throw new Error(`Invalid improvement transition: ${session.status} → ${status}.`);
  const now = new Date().toISOString();
  return { ...session, status, updatedAt: now, history: [...session.history, { at: now, from: session.status, to: status, note: note?.slice(0, 2000) || null }] };
}
export function addTestNote(session: ImprovementSession, summary: string, evidence?: string): ImprovementSession {
  const clean = summary.trim(); if (!clean) throw new Error('Enter a short test note.');
  const now = new Date().toISOString();
  return { ...session, updatedAt: now, testNotes: [...session.testNotes, { createdAt: now, summary: clean.slice(0, 2000), evidence: evidence?.trim().slice(0, 5000) || null, verification: 'user-reported-unverified' }] };
}

export function resetImportedFeedback(value: FeedbackCollections, oldWorkspaceId: string, newWorkspaceId: string): FeedbackCollections {
  const now = new Date().toISOString();
  const feedbacks = value.feedbacks.map(f => ({ ...f, workspaceId: newWorkspaceId, sessionId: newWorkspaceId, status: 'open' as const, provenance: { ...f.provenance, workspaceId: newWorkspaceId, sessionId: newWorkspaceId } }));
  const proposals = value.proposals.map(p => ({ ...p, workspaceId: newWorkspaceId, status: 'draft' as const, updatedAt: now, history: [...p.history, { at: now, field: 'import', before: p.status, after: 'draft; imported approval status was discarded' }] }));
  const improvementSessions = value.improvementSessions.map(s => ({ ...s, workspaceId: newWorkspaceId, status: 'draft' as const, updatedAt: now, history: [...s.history, { at: now, from: s.status, to: 'draft' as const, note: `Imported from workspace ${oldWorkspaceId}; prior lifecycle status was not trusted.` }] }));
  return { feedbacks, proposals, improvementSessions };
}

export function validateFeedbackCollections(workspaceId: string, workspace: Workspace, value: FeedbackCollections): FeedbackCollections {
  const { feedbacks, proposals, improvementSessions } = value;
  if (!Array.isArray(feedbacks) || feedbacks.length > 500 || !Array.isArray(proposals) || proposals.length > 500 || !Array.isArray(improvementSessions) || improvementSessions.length > 500) throw new Error('Invalid feedback collection size.');
  const cardMap = new Map(workspace.cards.map(card => [card.id, card.current]));
  const validEvidenceSet = new Set([...workspace.cards.map(c => JSON.stringify(c.current.evidence)), ...workspace.parsed.constraints.map(c => JSON.stringify(c.evidence)), JSON.stringify({text:workspace.originalInput,start:0,end:workspace.originalInput.length})]);
  const feedbackIds = new Set<string>();
  for (const f of feedbacks) {
    if (!f || !exact(f, ['schemaVersion','feedbackId','workspaceId','sessionId','createdAt','updatedAt','rating','category','originalFeedback','userExpectedResult','actualResult','relatedWorkCardIds','relatedAudioSHA','provider','status','provenance','history']) || f.schemaVersion !== 1 || !isUuid(f.feedbackId) || feedbackIds.has(f.feedbackId) || f.workspaceId !== workspaceId || f.sessionId !== workspaceId || !isDate(f.createdAt) || !isDate(f.updatedAt) || !['good','mixed','bad'].includes(f.rating) || !FEEDBACK_CATEGORIES.includes(f.category) || !safeText(f.originalFeedback) || !(f.userExpectedResult === null || safeText(f.userExpectedResult)) || !(f.actualResult === null || safeText(f.actualResult)) || !Array.isArray(f.relatedWorkCardIds) || f.relatedWorkCardIds.length > 100 || new Set(f.relatedWorkCardIds).size !== f.relatedWorkCardIds.length || f.relatedWorkCardIds.some(id => !cardMap.has(id)) || !(f.relatedAudioSHA === null || typeof f.relatedAudioSHA === 'string' && /^sha256:[0-9a-f]{64}$/.test(f.relatedAudioSHA)) || !['open','converted'].includes(f.status) || !f.provenance || !exact(f.provenance, ['workspaceId','sessionId','sourceEvidence']) || f.provenance.workspaceId !== workspaceId || f.provenance.sessionId !== workspaceId || !Array.isArray(f.provenance.sourceEvidence) || !f.provenance.sourceEvidence.length || f.provenance.sourceEvidence.length > 100 || f.provenance.sourceEvidence.some(e => !e || !exact(e, ['text','start','end']) || !validEvidence(workspace.originalInput, e) || !validEvidenceSet.has(JSON.stringify(e))) || !Array.isArray(f.history) || f.history.length > 2000) throw new Error('Invalid or tampered feedback record.');
    if (f.provider && (!exact(f.provider, ['providerId','modelId','runtime','executionMode']) || !safeText(f.provider.providerId,200) || !safeText(f.provider.modelId,200) || !(f.provider.runtime === null || safeText(f.provider.runtime,500)) || !['live','mock','unknown'].includes(f.provider.executionMode))) throw new Error('Invalid feedback provider provenance.');
    const speech=workspace.speech?.session;
    if(f.relatedAudioSHA!==(speech?.source.id??null))throw new Error('Feedback audio provenance does not match its workspace.');
    const expectedProvider=speech?{providerId:speech.recognition.provider,modelId:speech.recognition.modelId,runtime:speech.recognition.runtime?.runtime??null,executionMode:speech.recognition.runtime?.mode??'unknown'}:null;
    if(JSON.stringify(f.provider)!==JSON.stringify(expectedProvider))throw new Error('Feedback model provenance does not match its workspace.');
    const expectedEvidence=f.relatedWorkCardIds.length?workspace.cards.filter(card=>f.relatedWorkCardIds.includes(card.id)).map(card=>card.current.evidence):[{text:workspace.originalInput,start:0,end:workspace.originalInput.length}];
    if(JSON.stringify(f.provenance.sourceEvidence)!==JSON.stringify(expectedEvidence))throw new Error('Feedback source evidence does not match its related cards.');
    for (const h of f.history) if (!h || !exact(h, ['at','field','before','after']) || !isDate(h.at) || !safeText(h.field,100) || !(h.before === null || safeText(h.before)) || !(h.after === null || safeText(h.after))) throw new Error('Invalid feedback history.');
    feedbackIds.add(f.feedbackId);
  }
  const proposalMap = new Map<string, ImprovementProposal>();
  for (const p of proposals) {
    if (!p || !exact(p, ['schemaVersion','proposalId','workspaceId','feedbackIds','title','problemStatement','expectedBehavior','suggestedAcceptanceCriteria','priority','status','createdAt','updatedAt','sourceReferences','history']) || p.schemaVersion !== 1 || !isUuid(p.proposalId) || proposalMap.has(p.proposalId) || p.workspaceId !== workspaceId || !Array.isArray(p.feedbackIds) || !p.feedbackIds.length || p.feedbackIds.some(id => !feedbackIds.has(id)) || !safeText(p.title,500) || !p.title.trim() || !safeText(p.problemStatement) || !safeText(p.expectedBehavior) || !Array.isArray(p.suggestedAcceptanceCriteria) || p.suggestedAcceptanceCriteria.length > 100 || p.suggestedAcceptanceCriteria.some(x => !safeText(x,2000)) || !['low','medium','high'].includes(p.priority) || !['draft','approved','rejected'].includes(p.status) || !isDate(p.createdAt) || !isDate(p.updatedAt) || !Array.isArray(p.sourceReferences) || p.sourceReferences.length > 500 || p.sourceReferences.some(ref => !safeText(ref,300)) || !Array.isArray(p.history) || p.history.length > 2000) throw new Error('Invalid improvement proposal.');
    const expectedRefs=p.feedbackIds.flatMap(id=>{const f=feedbacks.find(item=>item.feedbackId===id)!;return [`feedback:${id}`,...f.relatedWorkCardIds.map(cardId=>`work-card:${cardId}`),...(f.relatedAudioSHA?[`audio:${f.relatedAudioSHA}`]:[])];});
    if(new Set(p.sourceReferences).size!==p.sourceReferences.length||expectedRefs.some(ref=>!p.sourceReferences.includes(ref))||p.sourceReferences.some(ref=>!expectedRefs.includes(ref)))throw new Error('Improvement proposal has invalid source references.');
    for(const h of p.history)if(!h||!exact(h,['at','field','before','after'])||!isDate(h.at)||!safeText(h.field,100)||!(h.before===null||safeText(h.before))||!(h.after===null||safeText(h.after)))throw new Error('Invalid proposal history.');
    proposalMap.set(p.proposalId, p);
  }
  const sessionIds = new Set<string>();
  const statuses: ImprovementStatus[] = ['draft','approved','in_progress','testing','resolved','reopened','rejected'];
  for (const s of improvementSessions) {
    const proposal = s && proposalMap.get(s.proposalId);
    if (!s || !exact(s, ['schemaVersion','sessionId','workspaceId','proposalId','feedbackIds','title','problemStatement','expectedBehavior','suggestedAcceptanceCriteria','priority','status','createdAt','updatedAt','sourceReferences','history','testNotes']) || s.schemaVersion !== 1 || !isUuid(s.sessionId) || sessionIds.has(s.sessionId) || s.workspaceId !== workspaceId || !proposal || !Array.isArray(s.feedbackIds) || JSON.stringify(s.feedbackIds) !== JSON.stringify(proposal.feedbackIds) || !safeText(s.title,500) || !safeText(s.problemStatement) || !safeText(s.expectedBehavior) || !Array.isArray(s.suggestedAcceptanceCriteria) || s.suggestedAcceptanceCriteria.some(x => !safeText(x,2000)) || !['low','medium','high'].includes(s.priority) || !statuses.includes(s.status) || !isDate(s.createdAt) || !isDate(s.updatedAt) || !Array.isArray(s.sourceReferences) || s.sourceReferences.some(ref => !safeText(ref,300)) || !Array.isArray(s.history) || s.history.length > 2000 || !Array.isArray(s.testNotes) || s.testNotes.length > 2000) throw new Error('Invalid improvement session.');
    if (proposal.status === 'draft' && s.status !== 'draft' || proposal.status === 'approved' && (s.status === 'draft' || s.status === 'rejected') || proposal.status === 'rejected' && s.status !== 'rejected') throw new Error('Proposal and improvement session review state do not match.');
    if(JSON.stringify(s.sourceReferences)!==JSON.stringify(proposal.sourceReferences)||s.title!==proposal.title||s.problemStatement!==proposal.problemStatement||s.expectedBehavior!==proposal.expectedBehavior||JSON.stringify(s.suggestedAcceptanceCriteria)!==JSON.stringify(proposal.suggestedAcceptanceCriteria)||s.priority!==proposal.priority)throw new Error('Improvement session content does not match the reviewed proposal.');
    for(const h of s.history)if(!h||!exact(h,['at','from','to','note'])||!isDate(h.at)||!statuses.includes(h.from)||!statuses.includes(h.to)||!(h.note===null||safeText(h.note,2000)))throw new Error('Invalid improvement history.');
    for(const note of s.testNotes)if(!note||!exact(note,['createdAt','summary','evidence','verification'])||!isDate(note.createdAt)||!safeText(note.summary,2000)||!note.summary.trim()||!(note.evidence===null||safeText(note.evidence,5000))||note.verification!=='user-reported-unverified')throw new Error('Invalid improvement test note.');
    sessionIds.add(s.sessionId);
  }
  if (improvementSessions.some(s => !proposalMap.has(s.proposalId)) || proposals.some(p => !improvementSessions.some(s => s.proposalId === p.proposalId))) throw new Error('Proposal/session relationship is incomplete.');
  return structuredClone(value);
}
