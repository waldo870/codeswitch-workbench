import { configuredLMStudioOptions } from '../llm/windows-wsl-endpoint.js';
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';
import { LMStudioAdapter, probeLMStudio, LMSTUDIO_PARAMETERS } from '../llm/lmstudio-adapter.js';
import { loadDataset } from './dataset.js';
import { runBaseline, summarize } from './runner.js';
import { makeReport, reportsDir } from './report.js';
import { runResearch } from './research.js';
import { researchMarkdown } from './research-report.js';
export async function researchMain(flags: string[]) {
  if (flags.some(f => !f.startsWith('--model=')) || flags.length !== 1) throw new Error('research requires exactly --model=advertised-id; no endpoint override.');
  const model = flags[0]!.slice(8), dataset = loadDataset();
  const transport = configuredLMStudioOptions();
  const probe = await probeLMStudio(transport);
  if (probe.status !== 'AVAILABLE' || !probe.models.some(m => m.id === model)) { console.error('LIVE_MODEL_STATUS=NOT_RUN: requested local model unavailable'); return 2; }
  const baseline = await runBaseline(dataset.examples);
  const recordedProbe = transport.windowsWslHost ? { ...probe, models: probe.models.filter(m => m.id === model) } : probe;
  const metadata = makeReport([{ method: 'A', model: 'p0-rules', status: 'RUN', reason: null, cases: baseline, summary: summarize(baseline) }], recordedProbe);
  metadata.environment.parameters = LMSTUDIO_PARAMETERS;
  const name = (transport.windowsWslHost ? 'p2-windows-' : 'p25-') + model.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const save = (run: Awaited<ReturnType<typeof runResearch>>) => {
    mkdirSync(reportsDir, { recursive: true });
    const output = { ...metadata, parameters: LMSTUDIO_PARAMETERS, runtime: { model, provider: 'lmstudio', runtimeLocation: transport.windowsWslHost ? 'windows-wsl-gateway' : 'loopback', gpu: 'NOT_VERIFIED', quantization: 'See MODEL_PROVENANCE.md' }, research: run };
    writeFileSync(`${reportsDir}/${name}.json`, JSON.stringify(output, null, 2) + '\n');
    writeFileSync(`${reportsDir}/${name}.md`, researchMarkdown(output));
    const last = run.raw.at(-1); if (last) console.log(JSON.stringify({ id: last.id, error: last.error?.code ?? null, ms: last.durationMs, complete: last.score.complete, attempted: run.attempted }));
  };
  const run = await runResearch(dataset.examples, new LMStudioAdapter(model, transport), { checkpoint: save });
  save(run);
  console.log(`RESEARCH_ATTEMPTS=${run.attempted}/${run.requested}; VALID_OUTPUTS=${run.completed}; PRODUCT_QUALIFICATION=NOT_GRANTED_BY_RESEARCH`);
  return run.attempted === dataset.examples.length ? 0 : 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) researchMain(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(e => { console.error(e instanceof Error ? e.message : 'Research failed'); process.exitCode = 1; });
