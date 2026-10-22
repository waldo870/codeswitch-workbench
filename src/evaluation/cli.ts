import { evaluateLMStudio } from './lmstudio-run.js';
import { pathToFileURL } from 'node:url';
import { loadDataset } from './dataset.js';
import { runBaseline, runLocal, summarize } from './runner.js';
import { collectReports, makeReport, saveReport, type MethodReport } from './report.js';
import { OllamaAdapter, probeOllama, type Probe } from '../llm/ollama-adapter.js';
export function chooseModels(probe: Probe, requested: string[] = []): string[] {
  if (requested.length > 2) throw new Error('At most two models per comparison.');
  if (requested.length) {
    if (new Set(requested).size !== requested.length || requested.some(name => !probe.models.some(m => m.name === name))) throw new Error('Requested model is not in local inventory. No downloads are performed.');
    return requested;
  }
  const qwen = probe.models.filter(m => /qwen/i.test(m.name)).sort((a, b) => a.size - b.size);
  const candidates = qwen.length ? qwen : [...probe.models].sort((a, b) => a.size - b.size);
  return [...new Set([candidates[0]?.name, candidates.at(-1)?.name].filter((s): s is string => Boolean(s)))];
}
export async function main(args = process.argv.slice(2)): Promise<number> {
  const [mode, ...flags] = args;
  if (mode === 'report') { const combined = collectReports(); saveReport('comparison', combined); console.log('Aggregated recorded results: reports/comparison.md (no inference)'); return 0; }
  const dataset = loadDataset();
  if (mode === 'baseline') {
    if (flags.length) throw new Error('Baseline accepts no model flags.');
    const cases = await runBaseline(dataset.examples);
    const report = makeReport([{ method: 'A', model: 'p0-rules', status: 'RUN', reason: null, cases, summary: summarize(cases) }]);
    saveReport('baseline', report); console.log(JSON.stringify(report.methods[0]!.summary!.overall, null, 2)); return 0;
  }
  if (mode === 'llm' && flags.includes('--provider=lmstudio')) return evaluateLMStudio(flags.filter(f => f !== '--provider=lmstudio'));
  if (mode !== 'llm') throw new Error('Usage: baseline | llm [--probe-only] [--model=local-tag] (up to two) | report');
  if (flags.some(f => f !== '--probe-only' && !f.startsWith('--model='))) throw new Error('Unknown flag. Arbitrary endpoints are not accepted by CLI.');
  const probe = await probeOllama();
  if (probe.status === 'NOT_RUN' || flags.includes('--probe-only')) {
    const reason = probe.reason ?? 'Discovery only; inference was not requested.';
    const methods: MethodReport[] = ['B', 'C'].map(method => ({ method: method as 'B' | 'C', model: 'none', status: 'NOT_RUN', reason, cases: [], summary: null }));
    saveReport('llm-not-run', makeReport(methods, probe)); console.log(`MODEL_EVALUATION_STATUS=NOT_RUN: ${reason}`); return 2;
  }
  for (const model of chooseModels(probe, flags.filter(f => f.startsWith('--model=')).map(f => f.slice(8)))) {
    const provider = new OllamaAdapter(model);
    const results = await runLocal(dataset.examples, provider);
    const methods: MethodReport[] = [{ method: 'B', model, status: 'RUN', reason: null, cases: results.raw, summary: summarize(results.raw) }, { method: 'C', model, status: 'RUN', reason: null, cases: results.verified, summary: summarize(results.verified) }];
    saveReport(`llm-${model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, makeReport(methods, probe));
    console.log(`${model}: measured ${results.raw.length} examples; failures ${methods[0]!.summary!.providerFailureCount}`);
  }
  return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().then(code => { process.exitCode = code; }).catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
