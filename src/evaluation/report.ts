import { SCORING_VERSION } from './scoring.js';
import { cpus, platform, arch, totalmem, release } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PARAMETERS, PROMPT_VERSION, SYSTEM_PROMPT } from '../llm/ollama-adapter.js';
import { summarize, type CaseResult } from './runner.js';
import { loadDataset } from './dataset.js';
export const reportsDir = fileURLToPath(new URL('../../reports/', import.meta.url));
export interface MethodReport { provider?: string; method: 'A' | 'B' | 'C'; model: string; status: 'RUN' | 'NOT_RUN'; reason: string | null; cases: CaseResult[]; summary: ReturnType<typeof summarize> | null }
export interface RunReport { schemaVersion: 1; timestamp: string; dataset: { version: string; hash: string; count: number }; environment: ReturnType<typeof environment>; methods: MethodReport[]; discovery?: unknown; stages?: unknown; runtime?: unknown; scoringAudit?: unknown }
function sourceFingerprint(): string {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const hash = createHash('sha256');
  function visit(relative: string) {
    for (const entry of readdirSync(join(root, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = relative + '/' + entry.name;
      if (entry.isDirectory()) visit(path);
      else if (path.endsWith('.ts')) hash.update(path + '\0').update(readFileSync(join(root, path)));
    }
  }
  for (const directory of ['src/contracts', 'src/engine', 'src/llm', 'src/evaluation']) visit(directory);
  return hash.digest('hex');
}
function environment() {
  let gitHead = 'unknown', gitDirty = true; try { gitDirty = Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: fileURLToPath(new URL('../../', import.meta.url)), encoding: 'utf8' }).trim()); gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: fileURLToPath(new URL('../../', import.meta.url)), encoding: 'utf8' }).trim(); } catch { /* archive without Git */ }
  return { scoringVersion: SCORING_VERSION, node: process.version, platform: platform(), arch: arch(), release: release(), cpu: cpus()[0]?.model ?? 'unknown', logicalCpus: cpus().length, memoryBytes: totalmem(), gpu: 'Not established by runner; see MODEL_PROVENANCE.md', gitHead, gitDirty, sourceSha256: sourceFingerprint(), promptVersion: PROMPT_VERSION, promptSha256: createHash('sha256').update(SYSTEM_PROMPT).digest('hex'), parameters: PARAMETERS as Record<string, number>, timeoutMs: 60000, maxResponseBytes: 262144, repetitions: 1, warmup: 'none; first sample includes model discovery/load if applicable' };
}
export function makeReport(methods: MethodReport[], discovery?: unknown): RunReport {
  const data = loadDataset();
  return { schemaVersion: 1, timestamp: new Date().toISOString(), dataset: { version: data.version, hash: data.hash, count: data.examples.length }, environment: environment(), methods, ...(discovery === undefined ? {} : { discovery }) };
}
const pct = (metric: { value: number | null }) => metric.value === null ? 'N/A' : `${(metric.value * 100).toFixed(2)}%`;
const esc = (s: string) => s.replace(/[|<>\r\n]/g, ' ');
export function markdown(report: RunReport): string {
  let md = `# P2A evaluation report\n\nTimestamp: ${report.timestamp}\n\nDataset: ${report.dataset.version}; SHA-256: ${report.dataset.hash}; ${report.dataset.count} examples.\n\nSingle-run preliminary benchmark. NOT_RUN is not a model score. Complete success requires semantic slots, counts, constraints, evidence, unresolved behavior and applicable safety blocking. Safe refusal alone is not task success.\n\n| Method | Model | Status | Complete | Intent | Count | Slots | Constraint recall | Unsupported actions | Evidence | Safe rejection | P50/P95 ms |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;
  for (const method of report.methods) {
    const s = method.summary?.overall;
    md += s ? `| ${method.method} | ${esc(method.model)}${method.provider ? ' (' + esc(method.provider) + ')' : ''} | RUN | ${pct(s.complete)} | ${pct(s.intentExact)} | ${pct(s.cardCount)} | ${pct(s.slots)} | ${pct(s.constraintRecall)} | ${pct(s.unsupportedActionRate)} | ${pct(s.evidenceValidity)} | ${pct(s.safeRejection)} | ${s.p50Ms?.toFixed(3)}/${s.p95Ms?.toFixed(3)} |\n` : `| ${method.method} | ${esc(method.model)}${method.provider ? ' (' + esc(method.provider) + ')' : ''} | NOT_RUN | — | — | — | — | — | — | — | — | — |\n`;
  }
  for (const method of report.methods) {
    md += `\n## ${method.method}: ${esc(method.model)}\n\n`;
    if (!method.summary) { md += `NOT_RUN: ${esc(method.reason ?? 'No measurements')}\n`; continue; }
    const s = method.summary;
    md += `| Category | Examples | Complete | Intent | Slots | Constraint recall |\n| --- | --- | --- | --- | --- | --- |\n`;
    for (const [group, v] of Object.entries(s.categories)) md += `| ${group} | ${v.examples} | ${pct(v.complete)} | ${pct(v.intentExact)} | ${pct(v.slots)} | ${pct(v.constraintRecall)} |\n`;
    md += `\nFailed example IDs: ${s.failedIds.join(', ') || 'none'}.\n\nRaw constraint error IDs: ${s.constraintErrors.join(', ') || 'none'}.\n\nRaw unsupported actions: ${JSON.stringify(s.unsupportedActions)}.\n\nIntercepted IDs: ${s.interceptedIds.join(', ') || 'none'}. Admitted draft cards: ${s.admittedDraftCount}.\n\nInvalid JSON: ${s.invalidJsonCount}; schema failures: ${s.schemaFailureCount}; timeouts: ${s.timeoutCount}; all provider failures: ${s.providerFailureCount}.\n\nRaw extraction complete: ${pct(s.rawOverall.complete)}; raw constraint recall: ${pct(s.rawOverall.constraintRecall)}; raw unsupported action rate: ${pct(s.rawOverall.unsupportedActionRate)}.\n\nEvidence denominator: ${s.overall.evidenceValidity.denominator}; safe-rejection denominator: ${s.overall.safeRejection.denominator}; latency samples: ${s.overall.latencySamples}. See JSON for every numerator/denominator, raw proposal, intercepted errors, admitted cards and per-example latency.\n`;
  }
  for (const [label, value] of [['Evaluation stages (not model scores)', report.stages], ['Runtime metadata', report.runtime], ['Scoring audit', report.scoringAudit]] as const) {
    if (value) md += `\n${label}:\n\n\`\`\`json\n${JSON.stringify(value, null, 2).replace(/[<>]/g, '').replace(/`/g, '\\u0060')}\n\`\`\`\n`;
  }

  return md + `\nNo work cards were executed. No UGen300/Hailo or speech measurements are represented.\n`;
}
export function saveReport(name: string, report: RunReport, directory = reportsDir) {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Invalid report filename.');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, name + '.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(join(directory, name + '.md'), markdown(report));
}
export function collectReports(directory = reportsDir): RunReport {
  const current = loadDataset(), methods: MethodReport[] = [], sources: unknown[] = [];
  for (const name of readdirSync(directory).filter(n => /^(baseline|llm-[a-z0-9-]+|p2a1-lmstudio)\.json$/.test(n)).sort()) {
    const report = JSON.parse(readFileSync(join(directory, name), 'utf8')) as RunReport;
    if (report.schemaVersion !== 1 || report.dataset.hash !== current.hash || report.dataset.version !== current.version || report.dataset.count !== current.examples.length) throw new Error(`Incompatible report: ${name}`);
    for (const method of report.methods) {
      if (method.method === 'A' && name !== 'baseline.json') continue;
      if (method.status === 'RUN') {
        if (report.environment.scoringVersion !== SCORING_VERSION) throw new Error(`Stale scoring version: ${name}; rerun the original provider, do not mix scores.`);
        if (method.cases.length !== current.examples.length || method.cases.some((c, i) => c.id !== current.examples[i]!.id || c.sourceInput !== current.examples[i]!.input)) throw new Error(`Incomplete or reordered run: ${name}`);
        methods.push({ ...method, summary: summarize(method.cases) });
      } else if (method.status === 'NOT_RUN' && !method.cases.length && method.summary === null) methods.push(method);
      else throw new Error(`Invalid run status: ${name}`);
    }
    sources.push({ filename: name, timestamp: report.timestamp, environment: report.environment, discovery: report.discovery });
  }
  if (!methods.length) throw new Error('No recorded benchmark results. Run baseline first.');
  // Historical NOT_RUN placeholders do not mask an actual run of the same method.
  const unique = [...new Map(methods.map(m => [[m.method, m.provider ?? (m.method === 'A' ? 'deterministic' : 'ollama'), m.model].join('|'), m])).values()];
  const kept = unique.filter(m => m.status === 'RUN' || !unique.some(other => (other.provider ?? 'ollama') === (m.provider ?? 'ollama') && other.method === m.method && other.status === 'RUN'));
  return makeReport(kept, { sourceReports: sources, note: 'Aggregation only; no model calls.' });
}
