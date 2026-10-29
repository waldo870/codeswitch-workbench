import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { buildP5DDataset, p5dDatasetSha256, P5D_SYNTHETIC_MARKER } from '../../src/evaluation/p5d-dataset.js';
import { buildP5DBaselineReport, buildP5DFinalReport } from '../../src/evaluation/p5d-evaluation.js';

const dataset=buildP5DDataset();
describe('P5D synthetic safety benchmark',()=>{
 it('has 100 originals, 300 marked variants and the required category/split balance',()=>{
  expect(dataset).toHaveLength(400);
  const originals=dataset.filter(x=>x.kind==='original'),variants=dataset.filter(x=>x.kind==='synthetic_variant');
  expect(originals).toHaveLength(100);expect(variants).toHaveLength(300);
  for(const category of ['zh-prohibition','en-prohibition','mixed-prohibition','precondition-exception','multi-intent-ambiguous']){
   expect(originals.filter(x=>x.category===category)).toHaveLength(20);
   expect(originals.filter(x=>x.category===category&&x.split==='development')).toHaveLength(12);
   expect(originals.filter(x=>x.category===category&&x.split==='held-out')).toHaveLength(8);
  }
  expect(variants.every(x=>x.mutation?.source===P5D_SYNTHETIC_MARKER&&x.split===originals.find(o=>o.id===x.sourceCaseId)?.split)).toBe(true);
  expect(new Set(variants.map(x=>x.mutation?.type))).toEqual(new Set(['negation_deletion','homophone_token_substitution','punctuation_boundary_change']));
 });
 it('keeps fixed gold/source content and a reproducible dataset digest',async()=>{
  expect(p5dDatasetSha256(buildP5DDataset())).toBe(p5dDatasetSha256(dataset));
  const fixture=JSON.parse(await readFile('tests/fixtures/p5d-safety-v1.json','utf8'));
  expect(p5dDatasetSha256(fixture)).toBe(p5dDatasetSha256(dataset));
  for(const v of dataset.filter(x=>x.kind==='synthetic_variant'))expect(v.gold.constraints).toEqual(dataset.find(o=>o.id===v.sourceCaseId)?.gold.constraints);
 });
 it('records an untouched deterministic baseline separately by split',()=>{
  const r=buildP5DBaselineReport({generatedAt:'fixed'});
  expect(r.counts).toMatchObject({originals:100,synthetic:300,total:400,development:240,heldOut:160});
  expect(r.liveASR).toBe(false);expect(r.status).toBe('SYNTHETIC_ONLY');
  expect(r.metrics.development.cases).toBe(240);expect(r.metrics.heldOut.cases).toBe(160);
 });
 it('holds the fail-closed gate without changing raw proposals or accepting executable cards',()=>{
  const r=buildP5DFinalReport({generatedAt:'fixed'});
  expect(r.cases.some(c=>c.blocked&&c.proposal.intents.length>0&&c.acceptedIntents.length===0)).toBe(true);
  expect(r.cases.filter(c=>c.blocked).every(c=>c.acceptedIntents.length===0)).toBe(true);
  expect(r.cases.every(c=>c.humanConfirmation.required===c.humanConfirmation.total)).toBe(true);
  expect(r.cases.some(c=>c.blockReasons.includes('unresolved_or_unrepresented_prohibition'))).toBe(true);
  expect(r.cases.some(c=>c.blockReasons.includes('condition_or_exception_requires_manual_review'))).toBe(true);
 });
 it('reports negation deletion as unrecoverable input damage, not parser reconstruction failure',()=>{
  const r=buildP5DFinalReport({generatedAt:'fixed'});
  const deleted=r.cases.filter(c=>c.mutation==='negation_deletion'&&c.gold.constraints.length>0);
  expect(deleted).toHaveLength(100);
  expect(deleted.every(c=>c.outcomeFlags.negationDeletionUnrecoverable)).toBe(true);
  expect(r.metrics.all.negationFlipRate).toEqual(buildP5DBaselineReport({generatedAt:'fixed'}).metrics.all.negationFlipRate);
  expect(r.metrics.all.outcomeCounts.negationFlipPrevented).toBeGreaterThan(0);
 });
 it('keeps evidence spans grounded in the exact synthetic input',()=>{
  const r=buildP5DBaselineReport({generatedAt:'fixed'});
  expect(r.cases.every(c=>c.evidence.valid===c.evidence.total)).toBe(true);
 });
 it('creates only unapproved P4G review drafts linked to development failures',()=>{
  const r=buildP5DFinalReport({generatedAt:'fixed'});
  expect(r.p4gDrafts.length).toBeGreaterThan(0);
  expect(r.p4gDrafts.every(p=>p.status==='draft'&&p.requiresHumanReview&&!p.verifiedDefect&&p.split==='development'&&p.sourceReferences.testCaseId===p.testCaseId)).toBe(true);
 });
});
