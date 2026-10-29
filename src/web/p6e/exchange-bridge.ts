import { validate } from '../../engine/validate.js';
import { createWorkspace, type Workspace } from '../state/workspace.js';
import type { RoutineRun } from './routine-model.js';

export interface RoutineWorkspaceConversion {
  workspace: Workspace | null;
  sourceText: string;
  supportedItems: number;
  intendedItems: number;
  unresolved: string[];
  metadataNotTransferred: string[];
  ready: boolean;
}

/** Uses the real P0 parser and validator. No WorkCard or Evidence is synthesized here. */
export function convertRoutineRunToWorkspace(run:RoutineRun):RoutineWorkspaceConversion {
  const intended=run.cards.filter(card=>card.status!=='rejected');
  const sourceText=intended.map(card=>card.title).join('\n');
  const metadataNotTransferred=[
    'Responsible person, deadline, priority, descriptions, and prerequisites are not P1 Work Card fields. P6G preserves supported metadata in a separate versioned handoff sidecar; these values are not synthesized into P1 fields.',
    'Routine confirmation state is not transferred. Generated P1 cards remain draft and require a new human confirmation.',
  ];
  if(intended.length===0)return{workspace:null,sourceText,supportedItems:0,intendedItems:0,unresolved:['There are no non-rejected routine items to convert.'],metadataNotTransferred,ready:false};
  try{
    const workspace=createWorkspace(sourceText);
    const report=validate(workspace.originalInput,workspace.parsed);
    const evidenceValid=workspace.parsed.cards.every(card=>workspace.originalInput.slice(card.evidence.start,card.evidence.end)===card.evidence.text);
    const unresolved=workspace.parsed.unresolved.map(item=>`${item.evidence.text}: ${item.reason}`);
    if(workspace.parsed.cards.length!==intended.length)unresolved.push(`Parser recognized ${workspace.parsed.cards.length} card(s) for ${intended.length} intended routine item(s).`);
    if(!report.valid)unresolved.push(...report.errors);
    if(!evidenceValid)unresolved.push('One or more parser evidence spans failed the source-text check.');
    const ready=unresolved.length===0&&workspace.cards.every(card=>card.current.status==='draft'&&card.current.requiresConfirmation);
    return{workspace:ready?workspace:null,sourceText,supportedItems:workspace.parsed.cards.length,intendedItems:intended.length,unresolved,metadataNotTransferred,ready};
  }catch(error){return{workspace:null,sourceText,supportedItems:0,intendedItems:intended.length,unresolved:[error instanceof Error?error.message:'Routine conversion failed validation.'],metadataNotTransferred,ready:false};}
}
