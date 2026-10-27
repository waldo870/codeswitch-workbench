import { assessSmokeCase } from './smoke-assessment.js';
import { probeLMStudio, LMStudioAdapter, LMSTUDIO_PARAMETERS, type LMStudioProbe } from '../llm/lmstudio-adapter.js';
import { groundEvidence } from '../llm/proposal-validation.js';
import type { ExtractionProvider } from '../llm/types.js';
import { loadDataset } from './dataset.js';
import { runBaseline, runLocal, summarize } from './runner.js';
import { makeReport, saveReport, type MethodReport, type RunReport } from './report.js';
export const SMOKE_IDS = ['zh-01', 'en-01', 'multi-03', 'constraints-01', 'constraints-03', 'constraints-08', 'ambiguous-03', 'ambiguous-02'] as const;
export async function runSmoke(provider: ExtractionProvider) {
  const examples = loadDataset().examples;
  const selected = SMOKE_IDS.map(id => { const e = examples.find(e => e.id === id); if (!e) throw new Error('Missing frozen smoke ID.'); return e; });
  const runs = await runLocal(selected, provider);
  const passed = runs.raw.every(c => c.rawValidation === 'valid' && c.rawProposal && [...c.rawProposal.cards, ...c.rawProposal.constraints, ...c.rawProposal.unresolved].length > 0 && [...c.rawProposal.cards, ...c.rawProposal.constraints, ...c.rawProposal.unresolved].every(x => groundEvidence(c.sourceInput, x.evidence).evidence !== null));
  // Smoke tests transport/schema/evidence mechanics; intercepted semantic errors remain visible.
  return { status: passed ? 'PASS' as const : 'FAIL' as const, ids: [...SMOKE_IDS], ...runs };
}
export function selectLMStudioModel(probe: LMStudioProbe, requested?: string): string | null {
  if (requested && !probe.models.some(m => m.id === requested)) throw new Error('Requested model is not advertised locally. No download is performed.');
  return requested ?? (probe.models.length === 1 ? probe.models[0]!.id : null);
}
export async function evaluateLMStudio(flags: string[], dependencies: { probe?: typeof probeLMStudio; provider?: (id: string) => ExtractionProvider; save?: (report: RunReport) => void } = {}): Promise<number> {
  if (flags.some(f => f !== '--probe-only' && !f.startsWith('--model=')) || flags.filter(f => f.startsWith('--model=')).length > 1) throw new Error('Use --provider=lmstudio [--probe-only] [--model=advertised-id]. No URL flag.');
  if (flags.some(f => f === '--model=')) throw new Error('Model ID cannot be empty.');
  const dataset = loadDataset(); // stop before any model calls on hash mismatch
  const baseline = await runBaseline(dataset.examples);
  const methods: MethodReport[] = [{ method: 'A', model: 'p0-rules', status: 'RUN', reason: null, cases: baseline, summary: summarize(baseline) }];
  const probe = await (dependencies.probe ?? probeLMStudio)();
  const model = probe.status === 'AVAILABLE' ? selectLMStudioModel(probe, flags.find(f => f.startsWith('--model='))?.slice(8)) : null;
  const reason = probe.reason ?? (flags.includes('--probe-only') ? 'Discovery only; no inference requested.' : 'Several model IDs are advertised; choose one explicitly after inspecting metadata.');
  const report = makeReport(methods, probe);
  const constraintCases = dataset.examples.filter(e => e.expectedConstraints.length);
  const safetyCases = dataset.examples.filter(e => e.expectedUnresolvedBehavior.safetyBlockRequired);
  report.scoringAudit = {
    constraintTupleDenominator: constraintCases.reduce((n, e) => n + e.expectedConstraints.length, 0),
    constraintCaseIds: constraintCases.map(e => e.id), safetyCaseIds: safetyCases.map(e => e.id),
    intersectionCaseIds: constraintCases.filter(e => safetyCases.some(s => s.id === e.id)).map(e => e.id),
    interpretation: 'Constraint recall measures retained gold tuples; safe rejection measures cases flagged for review, not recovered constraints or general safety proof.',
    fixedCounterexample: 'Relative-time aliases no longer equate target/name values tomorrow and 明天; only time slots use aliases. Gold bytes unchanged.',
  };
  report.environment.parameters = LMSTUDIO_PARAMETERS;
  report.environment.warmup = 'fixed 8-case smoke precedes full run; prompt/parameters unchanged';
  report.runtime = { provider: 'lmstudio', providerVersion: probe.version, modelId: model, digest: probe.models.find(m => m.id === model)?.digest ?? null, modelMetadata: probe.models.find(m => m.id === model)?.details ?? null, gpuAcceleration: 'NOT_VERIFIED', license: 'Not established by OpenAI-compatible inventory. Verify installed model license manually.' };
  report.stages = { mockTests: 'Software tests only; never included as live scores', smoke: 'NOT_RUN', fullLiveBenchmark: 'NOT_RUN', smokeIds: SMOKE_IDS };
  const save = () => (dependencies.save ?? (r => saveReport('p2a1-lmstudio', r)))(report);
  const notRun = (why: string) => {
    for (const method of ['B', 'C'] as const) methods.push({ provider: 'lmstudio', method, model: model ?? 'none', status: 'NOT_RUN', reason: why, cases: [], summary: null });
    save(); console.log(`LIVE_MODEL_STATUS=NOT_RUN: ${why}`); return 2;
  };
  if (probe.status !== 'AVAILABLE' || !model || flags.includes('--probe-only')) return notRun(reason);
  const provider = (dependencies.provider ?? (id => new LMStudioAdapter(id)))(model);
  const smoke = await runSmoke(provider);
  const fullSmokeCases = smoke.raw.map((raw, i) => assessSmokeCase(dataset.examples.find(e => e.id === raw.id)!, raw, smoke.verified[i]!));
  const fullSmokePass = fullSmokeCases.every(c => c.fullPass);
  report.stages = { mockTests: 'Software tests only', providerSmoke: smoke.status, smoke: fullSmokePass ? 'PASS' : 'FAIL', fullLiveBenchmark: 'NOT_RUN', smokeIds: SMOKE_IDS };
  report.discovery = { inventory: probe, smoke, fullSmokeCases }; // actual raw proposals/verification; not the scored full set
  if (!fullSmokePass) return notRun('Fixed smoke failed provider/schema/evidence/constraint/semantic checks; no full run.');
  const full = await runLocal(dataset.examples, provider);
  for (const [method, cases] of [['B', full.raw], ['C', full.verified]] as const) methods.push({ provider: 'lmstudio', method, model, status: 'RUN', reason: null, cases, summary: summarize(cases) });
  report.stages = { mockTests: 'Software tests only', smoke: 'PASS', fullLiveBenchmark: 'RUN', smokeIds: SMOKE_IDS };
  save();
  console.log(`LM Studio benchmark recorded: ${full.raw.length} examples; ${summarize(full.raw).providerFailureCount} provider failures.`);
  return full.raw.some(c => c.error) ? 1 : 0;
}
