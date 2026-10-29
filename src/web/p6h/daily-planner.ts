import { validateRoutineHandoff, type RoutineHandoff, type RoutineHandoffCard } from '../p6g/routine-handoff.js';
import type { Workspace } from '../state/workspace.js';

export const P6H_NAMESPACE='p6h.daily-plans' as const;
export const P6H_SCHEMA_VERSION=1 as const;
export type PlannerProgress='not_started'|'in_progress'|'blocked'|'done';
export interface PlannerItem {
  routineCardId:string;workCardId:string;scheduledDate:string;assignee:string|null;assigneeSource:'routine'|'user-edited';
  dueDate:string|null;dueDateSource:'routine'|'user-edited';progress:PlannerProgress;notes:string;updatedAt:string;
}
export interface PlannerReview {summary:string;carryForwardRoutineCardIds:string[];reviewedAt:string|null}
export interface DailyPlan {id:string;sourceOwnerWorkspaceId:string;sourceRunId:string;planDate:string;createdAt:string;updatedAt:string;items:PlannerItem[];satisfiedPrerequisites:string[];review:PlannerReview}
export interface DailyPlanCollection {format:'codeswitch-daily-plans';schemaVersion:typeof P6H_SCHEMA_VERSION;workspaceId:string;updatedAt:string;plans:DailyPlan[]}
export interface PlannerBuckets {today:PlannerItem[];upcoming:PlannerItem[];blocked:PlannerItem[];completed:PlannerItem[]}

const isRecord=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:object,keys:string[])=>Object.keys(v).length===keys.length&&keys.every(key=>Object.hasOwn(v,key));
const id=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=200&&!/[\x00-\x1f]/.test(v);
const text=(v:unknown,max=2000):v is string=>typeof v==='string'&&v.length<=max;
const iso=(v:unknown)=>typeof v==='string'&&!Number.isNaN(Date.parse(v));
export const isPlannerDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(`${v}T00:00:00Z`))&&new Date(`${v}T00:00:00Z`).toISOString().slice(0,10)===v;
const now=()=>new Date().toISOString();
const expectedItemKeys=['routineCardId','workCardId','scheduledDate','assignee','assigneeSource','dueDate','dueDateSource','progress','notes','updatedAt'];

export class DailyPlanError extends Error { constructor(message:string){super(message);this.name='DailyPlanError';} }

export function validateDailyPlan(value:unknown,workspace:Workspace,handoff:RoutineHandoff,expectedOwnerWorkspaceId?:string):DailyPlan {
  validateRoutineHandoff(handoff,workspace,expectedOwnerWorkspaceId);
  if(!isRecord(value)||!exact(value,['id','sourceOwnerWorkspaceId','sourceRunId','planDate','createdAt','updatedAt','items','satisfiedPrerequisites','review'])||!id(value.id)||!id(value.sourceOwnerWorkspaceId)||expectedOwnerWorkspaceId!==undefined&&value.sourceOwnerWorkspaceId!==expectedOwnerWorkspaceId||value.sourceOwnerWorkspaceId!==handoff.ownerWorkspaceId||value.sourceRunId!==handoff.sourceRunId||!isPlannerDate(value.planDate)||!iso(value.createdAt)||!iso(value.updatedAt)||!Array.isArray(value.items)||value.items.length<1||value.items.length>1000||!Array.isArray(value.satisfiedPrerequisites)||!isRecord(value.review)||!exact(value.review,['summary','carryForwardRoutineCardIds','reviewedAt'])||!text(value.review.summary,2000)||!Array.isArray(value.review.carryForwardRoutineCardIds)||value.review.carryForwardRoutineCardIds.length>1000||!(value.review.reviewedAt===null||iso(value.review.reviewedAt)))throw new DailyPlanError('Unsupported or malformed P6H daily plan.');
  const handoffCards=new Map(handoff.cards.map(card=>[card.routineCardId,card]));
  const workspaceCards=new Map(workspace.cards.map(card=>[card.id,card]));
  const seen=new Set<string>();
  for(const raw of value.items){
    if(!isRecord(raw)||!exact(raw,expectedItemKeys)||!id(raw.routineCardId)||!id(raw.workCardId)||seen.has(raw.routineCardId)||!isPlannerDate(raw.scheduledDate)||!(raw.assignee===null||text(raw.assignee,200))||!['routine','user-edited'].includes(String(raw.assigneeSource))||!(raw.dueDate===null||isPlannerDate(raw.dueDate))||!['routine','user-edited'].includes(String(raw.dueDateSource))||!['not_started','in_progress','blocked','done'].includes(String(raw.progress))||!text(raw.notes,2000)||!iso(raw.updatedAt))throw new DailyPlanError('P6H planner item failed schema validation.');
    const source=handoffCards.get(raw.routineCardId),card=workspaceCards.get(raw.workCardId);
    if(!source||source.workCardId!==raw.workCardId||!card||card.current.evidence.text!==source.sourceTitle||workspace.originalInput.slice(card.current.evidence.start,card.current.evidence.end)!==card.current.evidence.text)throw new DailyPlanError('P6H planner item does not map to unchanged P1 source evidence.');
    if(raw.assigneeSource==='routine'&&raw.assignee!==source.metadata.assignee||raw.dueDateSource==='routine'&&raw.dueDate!==source.metadata.deadline)throw new DailyPlanError('Routine metadata changed without a user-edited provenance marker.');
    seen.add(raw.routineCardId);
  }
  const validIds=new Set(handoff.cards.map(card=>card.routineCardId));
  const satisfied=value.satisfiedPrerequisites as unknown[];
  const carry=value.review.carryForwardRoutineCardIds as unknown[];
  if(satisfied.some(x=>!id(x)||!validIds.has(x))||new Set(satisfied).size!==satisfied.length||carry.some(x=>!id(x)||!seen.has(x))||new Set(carry).size!==carry.length)throw new DailyPlanError('P6H prerequisite or review references are invalid.');
  const satisfiedSet=new Set(satisfied as string[]);
  const planItems=value.items as PlannerItem[];
  for(const raw of value.items as PlannerItem[]){
    if(raw.progress!=='done')continue;
    const source=handoffCards.get(raw.routineCardId)!;
    if(source.dependencies.some(edge=>!satisfiedSet.has(edge.prerequisiteRoutineCardId)&&planItems.find(candidate=>candidate.routineCardId===edge.prerequisiteRoutineCardId)?.progress!=='done'))
      throw new DailyPlanError('A planner item cannot be complete while its prerequisite is incomplete.');
  }
  return structuredClone(value) as unknown as DailyPlan;
}

export function validateDailyPlanCollection(value:unknown,workspace:Workspace,handoff:RoutineHandoff,expectedWorkspaceId:string,expectedOwnerWorkspaceId?:string):DailyPlanCollection {
  if(!isRecord(value)||!exact(value,['format','schemaVersion','workspaceId','updatedAt','plans'])||value.format!=='codeswitch-daily-plans'||value.schemaVersion!==1||value.workspaceId!==expectedWorkspaceId||!id(value.workspaceId)||!iso(value.updatedAt)||!Array.isArray(value.plans)||value.plans.length>365)throw new DailyPlanError('Unsupported or malformed P6H plan collection.');
  const plans=value.plans.map(plan=>validateDailyPlan(plan,workspace,handoff,expectedOwnerWorkspaceId));
  if(new Set(plans.map(plan=>plan.id)).size!==plans.length||new Set(plans.map(plan=>plan.planDate)).size!==plans.length)throw new DailyPlanError('P6H plan IDs and dates must be unique within a workspace.');
  return structuredClone({...value,plans}) as unknown as DailyPlanCollection;
}

export function createDailyPlan(handoff:RoutineHandoff,planDate:string,idValue:string=globalThis.crypto.randomUUID(),createdAt=now()):DailyPlan {
  if(!isPlannerDate(planDate)||!id(idValue)||!iso(createdAt)||!handoff.cards.length)throw new DailyPlanError('A valid date, source handoff, and plan ID are required.');
  return {id:idValue,sourceOwnerWorkspaceId:handoff.ownerWorkspaceId,sourceRunId:handoff.sourceRunId,planDate,createdAt,updatedAt:createdAt,items:handoff.cards.map(card=>({routineCardId:card.routineCardId,workCardId:card.workCardId,scheduledDate:planDate,assignee:card.metadata.assignee,assigneeSource:'routine',dueDate:card.metadata.deadline,dueDateSource:'routine',progress:'not_started',notes:'',updatedAt:createdAt})),satisfiedPrerequisites:[],review:{summary:'',carryForwardRoutineCardIds:[],reviewedAt:null}};
}

export function updatePlannerItem(plan:DailyPlan,routineCardId:string,patch:Partial<Pick<PlannerItem,'scheduledDate'|'assignee'|'dueDate'|'progress'|'notes'>>,updatedAt=now()):DailyPlan {
  let found=false;
  const items=plan.items.map(item=>{if(item.routineCardId!==routineCardId)return item;found=true;return{...item,...structuredClone(patch),updatedAt,...(patch.assignee!==undefined?{assigneeSource:'user-edited' as const}:{}),...(patch.dueDate!==undefined?{dueDateSource:'user-edited' as const}:{})};});
  if(!found)throw new DailyPlanError('Planner item was not found.');
  return {...plan,updatedAt,items};
}

export function setPlannerProgress(plan:DailyPlan,workspace:Workspace,handoff:RoutineHandoff,routineCardId:string,progress:PlannerProgress,updatedAt=now()):DailyPlan {
  const next=updatePlannerItem(plan,routineCardId,{progress},updatedAt);
  return validateDailyPlan(next, workspace, handoff);
}

export function updatePlanReview(plan:DailyPlan,summary:string,carryForwardRoutineCardIds:string[],reviewedAt=now()):DailyPlan {
  if(!text(summary,2000)||!Array.isArray(carryForwardRoutineCardIds)||new Set(carryForwardRoutineCardIds).size!==carryForwardRoutineCardIds.length||carryForwardRoutineCardIds.some(id=>!plan.items.some(item=>item.routineCardId===id)))throw new DailyPlanError('End-of-day review is invalid.');
  return {...plan,updatedAt:reviewedAt,review:{summary,carryForwardRoutineCardIds:[...carryForwardRoutineCardIds],reviewedAt}};
}

export function createTomorrowDraft(plan:DailyPlan,handoff:RoutineHandoff,workspace:Workspace,tomorrowDate:string,idValue:string=globalThis.crypto.randomUUID(),createdAt=now()):DailyPlan {
  if(!isPlannerDate(tomorrowDate)||tomorrowDate<=plan.planDate||!id(idValue)||!iso(createdAt))throw new DailyPlanError('Tomorrow draft must have a valid later date.');
  const done=new Set([...plan.satisfiedPrerequisites,...plan.items.filter(item=>item.progress==='done').map(item=>item.routineCardId)]);
  const remaining=plan.items.filter(item=>item.progress!=='done');
  if(!remaining.length)throw new DailyPlanError('All planned items are complete; there are no cards to carry forward.');
  const carry=plan.review.reviewedAt?plan.review.carryForwardRoutineCardIds:null;
  const selected=carry?remaining.filter(item=>carry.includes(item.routineCardId)):remaining;
  if(!selected.length)throw new DailyPlanError('No incomplete items were selected for tomorrow.');
  const next:DailyPlan={...plan,id:idValue,planDate:tomorrowDate,createdAt,updatedAt:createdAt,items:selected.map(item=>({...item,scheduledDate:tomorrowDate,progress:'not_started',notes:'',updatedAt:createdAt})),satisfiedPrerequisites:[...done],review:{summary:'',carryForwardRoutineCardIds:[],reviewedAt:null}};
  return validateDailyPlan(next,workspace,handoff,handoff.ownerWorkspaceId);
}

function dependencyBlocked(item:PlannerItem,items:PlannerItem[],handoff:RoutineHandoff,satisfied:Set<string>):boolean {
  if(item.progress==='blocked')return true;
  const card=handoff.cards.find(candidate=>candidate.routineCardId===item.routineCardId);
  return (card?.dependencies??[]).some(edge=>{if(satisfied.has(edge.prerequisiteRoutineCardId))return false;const prerequisite=items.find(candidate=>candidate.routineCardId===edge.prerequisiteRoutineCardId);return prerequisite?.progress!=='done';});
}

export function bucketPlanItems(plan:DailyPlan,handoff:RoutineHandoff,today:string):PlannerBuckets {
  const satisfied=new Set(plan.satisfiedPrerequisites),buckets:PlannerBuckets={today:[],upcoming:[],blocked:[],completed:[]};
  for(const item of plan.items){if(item.progress==='done'){buckets.completed.push(item);continue;}if(dependencyBlocked(item,plan.items,handoff,satisfied)){buckets.blocked.push(item);continue;}if(item.scheduledDate<=today)buckets.today.push(item);else buckets.upcoming.push(item);}
  return buckets;
}

export function updateDailyPlanCollection(collection:DailyPlanCollection,plan:DailyPlan,workspace:Workspace,handoff:RoutineHandoff):DailyPlanCollection {
  const exists=collection.plans.some(item=>item.id===plan.id);
  const plans=exists?collection.plans.map(item=>item.id===plan.id?plan:item):[...collection.plans,plan];
  return validateDailyPlanCollection({...collection,updatedAt:now(),plans},workspace,handoff,collection.workspaceId,handoff.ownerWorkspaceId);
}

export function plannerSourceCard(handoff:RoutineHandoff,routineCardId:string):RoutineHandoffCard|undefined {return handoff.cards.find(card=>card.routineCardId===routineCardId);}
