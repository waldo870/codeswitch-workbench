import { writeFileSync, mkdirSync } from 'node:fs';
import { configuredLMStudioOptions } from '../llm/windows-wsl-endpoint.js';
import { LMStudioAdapter, probeLMStudio, LMSTUDIO_PARAMETERS } from '../llm/lmstudio-adapter.js';
import { SMOKE_IDS } from './lmstudio-run.js';
import { runLocal } from './runner.js';
import { loadDataset } from './dataset.js';
import { makeReport, reportsDir } from './report.js';
import { assessSmokeCase } from './smoke-assessment.js';
const flags = process.argv.slice(2);
if (flags.length !== 1 || !flags[0]!.startsWith('--model=') || !flags[0]!.slice(8)) throw new Error('Use --model=advertised-id and CODESWITCH_WINDOWS_WSL_HOST.');
const model = flags[0]!.slice(8), options = configuredLMStudioOptions();
if (!options.windowsWslHost) throw new Error('Explicit Windows WSL host configuration required.');
const dataset = loadDataset(), probe = await probeLMStudio(options);
if (!probe.models.some(m => m.id === model)) { console.error('SMOKE_STATUS=NOT_RUN: Windows model unavailable.'); process.exitCode = 2; }
else {
 const provider = new LMStudioAdapter(model, options);
 const runs = await runLocal(SMOKE_IDS.map(id => dataset.examples.find(e => e.id === id)!), provider);
 const assessments = runs.raw.map((raw, i) => assessSmokeCase(dataset.examples.find(e => e.id === raw.id)!, raw, runs.verified[i]!));
 const counts = Object.fromEntries(['providerPass','schemaPass','evidencePass','constraintPass','semanticPass','fullPass'].map(key => [key, assessments.filter(a => a[key as keyof typeof a] === true).length]));
 const metadata = makeReport([]); metadata.environment.parameters = LMSTUDIO_PARAMETERS;
 const report = { ...metadata, runtimeLocation: 'windows-wsl-gateway', model, parameters: LMSTUDIO_PARAMETERS, ids: SMOKE_IDS, counts, assessments, ...runs, productAdmission: false };
 mkdirSync(reportsDir, { recursive: true });
 writeFileSync(`${reportsDir}/p2-windows-smoke.json`, JSON.stringify(report, null, 2) + '\n');
 console.log(JSON.stringify({ model, counts, assessments }, null, 2));
 process.exitCode = counts.fullPass === SMOKE_IDS.length ? 0 : 2;
}
