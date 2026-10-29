import { describe, expect, it } from 'vitest';
import { createRoutineRun, editRoutineTemplate, createDefaultTemplates, updateRoutineCard, type RoutineDocument } from '../../../src/web/p6e/routine-model.js';
import { convertRoutineRunToWorkspace } from '../../../src/web/p6e/exchange-bridge.js';
import { createRoutineHandoff, importRoutineHandoff, RoutineHandoffError, validateRoutineHandoff } from '../../../src/web/p6g/routine-handoff.js';

const sourceId='11111111-1111-4111-8111-111111111111';
function fixture(prerequisite='Check sandbox credentials') {
  const seed=createDefaultTemplates()[0]!;
  let doc:RoutineDocument={schemaVersion:1,workspaceId:sourceId,updatedAt:new Date().toISOString(),templates:[seed],runs:[]};
  doc=editRoutineTemplate(doc,seed.id,[{id:'task-a',title:'Check sandbox credentials',description:'Inspect existing sandbox access.',prerequisites:[]},{id:'task-b',title:'Review payment webhook',description:'Do not deploy.',prerequisites:[prerequisite]}]);
  doc=createRoutineRun(doc,seed.id);
  const created=doc.runs[0]!;
  doc=updateRoutineCard(doc,created.id,created.cards[0]!.id,{assignee:'Alex',deadline:'2026-11-01',priority:'high'});
  doc=updateRoutineCard(doc,created.id,created.cards[1]!.id,{description:'Review no-send restriction.',priority:'low'});
  const run=doc.runs[0]!;
  const conversion=convertRoutineRunToWorkspace(run);
  if(!conversion.ready||!conversion.workspace)throw new Error(`Fixture conversion failed: ${conversion.unresolved.join('; ')}`);
  const handoff=createRoutineHandoff(run,conversion.workspace,'22222222-2222-4222-8222-222222222222','2026-10-30T00:00:00.000Z');
  return {run,workspace:conversion.workspace,handoff};
}
describe('P6G routine metadata handoff contract',()=>{
  it('round-trips separately from immutable P1 cards and preserves prerequisite direction',()=>{
    const {workspace,handoff}=fixture();
    expect(handoff.schemaVersion).toBe(1);
    expect(handoff.cards[0]?.metadata).toEqual({assignee:'Alex',deadline:'2026-11-01',priority:'high',description:'Inspect existing sandbox access.'});
    expect(handoff.cards[1]?.dependencies).toEqual([{dependentRoutineCardId:handoff.cards[1]!.routineCardId,prerequisiteRoutineCardId:handoff.cards[0]!.routineCardId}]);
    expect(workspace.cards.map(c=>c.current.status)).toEqual(['draft','draft']);
    expect(validateRoutineHandoff(handoff,workspace,handoff.ownerWorkspaceId)).toEqual(handoff);
    expect(importRoutineHandoff(handoff,workspace,handoff.ownerWorkspaceId)).toEqual(handoff);
  });
  it('blocks unsupported or ambiguous prerequisite labels instead of dropping them',()=>{
    expect(()=>fixture('Access approved by operator')).toThrow(RoutineHandoffError);
  });
  it('rejects altered evidence, unknown cards, bad prerequisite direction, and cycles',()=>{
    const {workspace,handoff}=fixture();
    const changedTitle=structuredClone(workspace);changedTitle.cards[0]!.current.evidence.text='forged source';
    expect(()=>validateRoutineHandoff(handoff,changedTitle,handoff.ownerWorkspaceId)).toThrow(/evidence/);
    expect(()=>validateRoutineHandoff({...handoff,cards:handoff.cards.map((c,i)=>i?{...c,workCardId:'missing-card'}:c)},workspace)).toThrow();
    const wrongDirection=structuredClone(handoff);wrongDirection.cards[1]!.dependencies[0]!.dependentRoutineCardId=handoff.cards[0]!.routineCardId;
    expect(()=>validateRoutineHandoff(wrongDirection,workspace)).toThrow(/direction/);
    const cyclic=structuredClone(handoff);cyclic.cards[0]!.dependencies.push({dependentRoutineCardId:handoff.cards[0]!.routineCardId,prerequisiteRoutineCardId:handoff.cards[1]!.routineCardId});
    expect(()=>validateRoutineHandoff(cyclic,workspace)).toThrow(/cycle/);
    const invalidDate=structuredClone(handoff);invalidDate.cards[0]!.metadata.deadline='2026-02-31';
    expect(()=>validateRoutineHandoff(invalidDate,workspace)).toThrow(/metadata/);
  });
  it('rejects metadata bound to a different owner workspace and never includes a confirmation field',()=>{
    const {workspace,handoff}=fixture();
    expect(()=>validateRoutineHandoff(handoff,workspace,sourceId)).toThrow(/workspace/);
    expect(JSON.stringify(handoff)).not.toMatch(/confirmed|approved/i);
  });
});
