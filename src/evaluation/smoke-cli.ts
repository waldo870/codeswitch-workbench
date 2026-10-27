import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { LMStudioAdapter, probeLMStudio, LMSTUDIO_PARAMETERS } from '../llm/lmstudio-adapter.js';
import { SYSTEM_PROMPT } from '../llm/ollama-adapter.js';
import { redactDiagnostic } from '../llm/diagnostics.js';
import { SMOKE_IDS } from './lmstudio-run.js';
import { loadDataset } from './dataset.js';
import { runLocal } from './runner.js';
import { makeReport } from './report.js';
import { assessSmokeCase } from './smoke-assessment.js';
// Dedicated hotfix revalidation: exactly the frozen smoke IDs, never the 60-case runner.
const model = 'gemma-3-4b-it';
const dataset = loadDataset(), inventory = await probeLMStudio();
if (inventory.status !== 'AVAILABLE' || !inventory.models.some(m => m.id === model)) { console.error('SMOKE_STATUS=NOT_RUN: requested local model is unavailable.'); process.exitCode = 2; }
else {
  const provider = new LMStudioAdapter(model), cases: ReturnType<typeof assessSmokeCase>[] = [], local: unknown[] = [];
  const directory = fileURLToPath(new URL('../../reports/', import.meta.url));
  const localDirectory = join(directory, 'local-diagnostics'); mkdirSync(localDirectory, { recursive: true });
  for (const id of SMOKE_IDS) {
    const gold = dataset.examples.find(e => e.id === id)!;
    const runs = await runLocal([gold], { extract: input => provider.extract(input, { caseId: id }) });
    const raw = runs.raw[0]!, verified = runs.verified[0]!;
    const assessment = assessSmokeCase(gold, raw, verified); cases.push(assessment);
    // Raw proposals/source text stay in the ignored local file, after redaction.
    local.push({ caseId: id, sourceInput: redactDiagnostic(raw.sourceInput, 10000), rawText: raw.rawText === null ? null : redactDiagnostic(raw.rawText, 8192), diagnostics: raw.diagnostics, verification: verified.verification, score: raw.rawScore });
    writeFileSync(join(localDirectory, 'p2a4-smoke.json'), JSON.stringify(local, null, 2) + '\n');
    console.log(JSON.stringify(assessment));
  }
  const counts = Object.fromEntries(['providerPass', 'schemaPass', 'evidencePass', 'constraintPass', 'semanticPass', 'fullPass'].map(key => [key, cases.filter(c => c[key as keyof typeof c] === true).length]));
  const report = { environment: makeReport([]).environment, inventory, timestamp: new Date().toISOString(), model, parameters: LMSTUDIO_PARAMETERS, promptSha256: createHash('sha256').update(SYSTEM_PROMPT).digest('hex'), datasetHash: dataset.hash, smokeIds: SMOKE_IDS, total: cases.length, counts, fullBenchmarkStatus: 'NOT_RUN', timeout: cases.some(c => c.error?.code === 'TIMEOUT') ? 'TIMEOUT_UNRESOLVED' : 'NOT_REPRODUCED', cases };
  writeFileSync(join(directory, 'p2a4-smoke.json'), JSON.stringify(report, null, 2) + '\n');
  const rows = cases.map(c => `| ${c.id} | ${c.providerPass} | ${c.schemaPass} | ${c.evidencePass} | ${c.constraintPass} | ${c.semanticPass} | ${c.fullPass} | ${c.latencyMs.toFixed(1)} | ${c.error?.code ?? 'none'} |`).join('\n');
  writeFileSync(join(directory, 'p2a4-smoke.md'), `# P2A.4 live smoke revalidation\n\nModel: ${model}. Dataset SHA-256: ${dataset.hash}. Timestamp: ${report.timestamp}.\n\nProvider/schema compatibility and semantic quality are reported separately. No prompt, gold, schema, timeout or model changes. Raw diagnostics are local-only and ignored by Git.\n\n| Case | Provider | Schema | Evidence | Constraints | Semantics | Full | ms | Error |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${rows}\n\nCounts: ${JSON.stringify(counts)}.\n\nTimeout: ${report.timeout}. Full benchmark: NOT_RUN. No model or hardware acceleration claim follows from software tests.\n`);
  console.log('SMOKE_SUMMARY=' + JSON.stringify(counts));
  process.exitCode = cases.every(c => c.fullPass) ? 0 : 2;
}
