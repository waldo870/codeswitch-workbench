import { expect, it } from 'vitest';
import { confirmCard, createWorkspace, editCard, EXAMPLE } from '../../src/web/state/workspace.js';
import { invalidateImportedConfirmations, parseWorkspaceBundle, type WorkspaceBundle } from '../../src/web/storage/workspace-db.js';

function bundle(workspace=createWorkspace(EXAMPLE)):WorkspaceBundle {
  const now='2026-10-28T00:00:00.000Z';
  return {format:'codeswitch-workspace',schemaVersion:2,workspaceId:'12345678-1234-4234-8234-123456789abc',createdAt:now,updatedAt:now,workspace,exportMetadata:[],feedbacks:[],proposals:[],improvementSessions:[]};
}

it('validates complete Workspace JSON and refuses incompatible versions or tampered evidence',()=>{
  expect(parseWorkspaceBundle(bundle()).workspace.parsed.constraints[0]?.evidence.text).toContain("don't deploy");
  expect(()=>parseWorkspaceBundle({...bundle(),schemaVersion:99})).toThrow(/Unsupported/);
  const tampered=structuredClone(bundle());tampered.workspace.parsed.cards[1]!.evidence.start++;
  expect(()=>parseWorkspaceBundle(tampered)).toThrow(/evidence|changed/i);
});

it('imports Workspace JSON v1 as an empty-feedback v2 record without changing source data',()=>{
  const current=bundle();const legacy={format:current.format,schemaVersion:1,workspaceId:current.workspaceId,createdAt:current.createdAt,updatedAt:current.updatedAt,workspace:current.workspace,exportMetadata:current.exportMetadata};
  const migrated=parseWorkspaceBundle(legacy);
  expect(migrated).toMatchObject({schemaVersion:2,feedbacks:[],proposals:[],improvementSessions:[],workspace:{originalInput:EXAMPLE}});
});

it('resets imported confirmations but retains user edits, rejection, evidence and constraints',()=>{
  let workspace=createWorkspace(EXAMPLE);
  workspace=editCard(workspace,'card-2','title','Check sandbox credentials ');
  workspace=confirmCard(workspace,'card-2');
  const imported=invalidateImportedConfirmations(workspace);
  expect(imported.cards[1]).toMatchObject({current:{title:'Check sandbox credentials ',status:'draft',requiresConfirmation:true},confirmedRevision:null});
  expect(imported.cards[1]!.history).toEqual([{kind:'edit',field:'title',before:'Check sandbox credentials',after:'Check sandbox credentials '}]);
  expect(imported.cards[1]!.current.evidence).toEqual(workspace.parsed.cards[1]!.evidence);
  expect(imported.parsed.constraints).toEqual(workspace.parsed.constraints);
});
