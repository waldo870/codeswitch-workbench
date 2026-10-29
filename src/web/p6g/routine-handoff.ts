import type { RoutineRun } from '../p6e/routine-model.js';
import type { Workspace } from '../state/workspace.js';

export const ROUTINE_HANDOFF_NAMESPACE = 'p6g.routine-handoff' as const;
export const ROUTINE_HANDOFF_VERSION = 1 as const;
export type HandoffPriority = 'low' | 'normal' | 'high';
export interface HandoffDependency { dependentRoutineCardId: string; prerequisiteRoutineCardId: string }
export interface RoutineHandoffCard {
  routineCardId: string;
  workCardId: string;
  sourceTitle: string;
  metadata: { assignee: string | null; deadline: string | null; priority: HandoffPriority; description: string };
  dependencies: HandoffDependency[];
}
export interface RoutineHandoff {
  format: 'codeswitch-routine-handoff';
  schemaVersion: typeof ROUTINE_HANDOFF_VERSION;
  ownerWorkspaceId: string;
  sourceRunId: string;
  sourceTemplateId: string;
  sourceTemplateVersion: number;
  createdAt: string;
  cards: RoutineHandoffCard[];
}

const rec=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:object,keys:string[])=>Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const str=(v:unknown,max=2000):v is string=>typeof v==='string'&&v.length<=max;
const id=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=200&&!/[\x00-\x1f]/.test(v);
const iso=(v:unknown)=>typeof v==='string'&&!Number.isNaN(Date.parse(v));
const dateOnly=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(`${v}T00:00:00Z`))&&new Date(`${v}T00:00:00Z`).toISOString().slice(0,10)===v;
const normalize=(v:string)=>v.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();

export class RoutineHandoffError extends Error {
  constructor(message:string, readonly unresolved:string[]=[]){super(message);this.name='RoutineHandoffError';}
}

/** Build only from P6E routine data and P1 parser output; no WorkCard fields/evidence are fabricated. */
export function createRoutineHandoff(run:RoutineRun, workspace:Workspace, ownerWorkspaceId:string, createdAt=new Date().toISOString()):RoutineHandoff {
  const intended=run.cards.filter(c=>c.status!=='rejected');
  if(!id(ownerWorkspaceId)||!id(run.id)||!id(run.templateId)||!intended.length||intended.length!==workspace.cards.length)throw new RoutineHandoffError('Routine handoff requires a one-to-one P1 parser conversion.');
  if(!iso(createdAt)||run.cards.some(c=>c.requiresConfirmation!==true))throw new RoutineHandoffError('Routine source provenance is invalid.');
  const used=new Set<string>(), unresolved:string[]=[];
  const cards:RoutineHandoffCard[]=intended.map(routine=>{
    const candidates=workspace.cards.filter(card=>card.current.evidence.text===routine.title&&workspace.originalInput.slice(card.current.evidence.start,card.current.evidence.end)===routine.title);
    if(candidates.length!==1){unresolved.push(`${routine.title}: source evidence does not map uniquely to a P1 card.`);return null as never;}
    const card=candidates[0]!;
    if(used.has(card.id)){unresolved.push(`${routine.title}: duplicate P1 card mapping.`);return null as never;}
    used.add(card.id);
    const dependencies:HandoffDependency[]=[];
    for(const prerequisite of routine.prerequisites){
      const matches=intended.filter(other=>normalize(other.title)===normalize(prerequisite));
      if(matches.length!==1){unresolved.push(`${routine.title}: prerequisite “${prerequisite}” is ${matches.length?'ambiguous':'not another routine-card title'}; specify an explicit dependency before handoff.`);continue;}
      const dependency=matches[0]!;
      if(dependency.id===routine.id){unresolved.push(`${routine.title}: a card cannot depend on itself.`);continue;}
      dependencies.push({dependentRoutineCardId:routine.id,prerequisiteRoutineCardId:dependency.id});
    }
    return {routineCardId:routine.id,workCardId:card.id,sourceTitle:routine.title,metadata:{assignee:routine.assignee,deadline:routine.deadline,priority:routine.priority,description:routine.description},dependencies};
  });
  if(unresolved.length)throw new RoutineHandoffError('Routine metadata handoff is blocked until unresolved mappings are corrected.',unresolved);
  const handoff:RoutineHandoff={format:'codeswitch-routine-handoff',schemaVersion:1,ownerWorkspaceId,sourceRunId:run.id,sourceTemplateId:run.templateId,sourceTemplateVersion:run.templateVersion,createdAt,cards};
  validateRoutineHandoff(handoff,workspace,ownerWorkspaceId);
  return handoff;
}

export function validateRoutineHandoff(value:unknown, workspace:Workspace, expectedOwnerWorkspaceId?:string):RoutineHandoff {
  if(!rec(value)||!exact(value,['format','schemaVersion','ownerWorkspaceId','sourceRunId','sourceTemplateId','sourceTemplateVersion','createdAt','cards'])||value.format!=='codeswitch-routine-handoff'||value.schemaVersion!==1||!id(value.ownerWorkspaceId)||!id(value.sourceRunId)||!id(value.sourceTemplateId)||!Number.isSafeInteger(value.sourceTemplateVersion)||Number(value.sourceTemplateVersion)<1||!iso(value.createdAt)||!Array.isArray(value.cards)||value.cards.length<1||value.cards.length>1000)throw new RoutineHandoffError('Unsupported or malformed routine handoff metadata.');
  if(expectedOwnerWorkspaceId!==undefined&&value.ownerWorkspaceId!==expectedOwnerWorkspaceId)throw new RoutineHandoffError('Routine handoff belongs to a different source workspace.');
  const validCards=new Set(workspace.cards.map(card=>card.id));
  const seenP1=new Set<string>(),seenRoutine=new Set<string>();
  const graph=new Map<string,string[]>();
  for(const item of value.cards){
    if(!rec(item)||!exact(item,['routineCardId','workCardId','sourceTitle','metadata','dependencies'])||!id(item.routineCardId)||!validCards.has(String(item.workCardId))||!id(item.workCardId)||seenP1.has(item.workCardId)||seenRoutine.has(item.routineCardId)||!str(item.sourceTitle,300)||!rec(item.metadata)||!exact(item.metadata,['assignee','deadline','priority','description'])||!(item.metadata.assignee===null||str(item.metadata.assignee,200))||!(item.metadata.deadline===null||dateOnly(item.metadata.deadline))||!['low','normal','high'].includes(String(item.metadata.priority))||!str(item.metadata.description,2000)||!Array.isArray(item.dependencies)||item.dependencies.length>1000)throw new RoutineHandoffError('Routine handoff card metadata failed validation.');
    const p1=workspace.cards.find(card=>card.id===item.workCardId)!;
    if(workspace.originalInput.slice(p1.current.evidence.start,p1.current.evidence.end)!==p1.current.evidence.text||p1.current.evidence.text!==item.sourceTitle)throw new RoutineHandoffError('Routine handoff source evidence does not match the linked P1 card.');
    seenP1.add(item.workCardId);seenRoutine.add(item.routineCardId);graph.set(item.routineCardId,[]);
  }
  if(seenP1.size!==workspace.cards.length)throw new RoutineHandoffError('Routine handoff must map every converted P1 card exactly once.');
  const edgeKeys=new Set<string>();
  for(const item of value.cards as RoutineHandoffCard[]){for(const edge of item.dependencies){
    if(!rec(edge)||!exact(edge,['dependentRoutineCardId','prerequisiteRoutineCardId'])||edge.dependentRoutineCardId!==item.routineCardId||!seenRoutine.has(edge.prerequisiteRoutineCardId)||edge.prerequisiteRoutineCardId===edge.dependentRoutineCardId)throw new RoutineHandoffError('Routine prerequisite direction or target is invalid.');
    const key=`${edge.dependentRoutineCardId}->${edge.prerequisiteRoutineCardId}`;if(edgeKeys.has(key))throw new RoutineHandoffError('Routine prerequisite is duplicated.');edgeKeys.add(key);graph.get(edge.dependentRoutineCardId)!.push(edge.prerequisiteRoutineCardId);
  }}
  const visiting=new Set<string>(),visited=new Set<string>();
  const walk=(node:string):boolean=>{if(visiting.has(node))return false;if(visited.has(node))return true;visiting.add(node);for(const parent of graph.get(node)??[])if(!walk(parent))return false;visiting.delete(node);visited.add(node);return true;};
  if([...graph.keys()].some(node=>!walk(node)))throw new RoutineHandoffError('Routine prerequisite graph contains a cycle.');
  return structuredClone(value) as unknown as RoutineHandoff;
}

/** Imported metadata is validated against the new local record; no status/approval exists in this contract. */
export function importRoutineHandoff(value:unknown, workspace:Workspace, originalOwnerWorkspaceId:string):RoutineHandoff {
  return validateRoutineHandoff(value,workspace,originalOwnerWorkspaceId);
}
