import { summarize, type CaseResult } from './runner.js';
import { percentile } from './scoring.js';
import type { RunReport } from './report.js';
import type { ResearchSnapshot } from './research.js';
export function researchMarkdown(report: RunReport & { research: ResearchSnapshot }) {
  const run = report.research;
  const validRaw = run.raw.filter(c => !c.error), validVerified = run.verified.filter(c => !c.error);
  const metric = (m: { numerator: number; denominator: number; value: number | null }) => m.denominator ? `${m.numerator}/${m.denominator} (${(100 * m.value!).toFixed(2)}%)` : 'NOT_EVALUABLE (0 eligible observations)';
  const status = run.attempted < run.requested && run.stopReason === 'DATASET_COMPLETE' ? 'IN_PROGRESS_LEGACY_CHECKPOINT' : run.stopReason;
  const windows = Boolean(report.runtime && typeof report.runtime === 'object' && 'runtimeLocation' in report.runtime && report.runtime.runtimeLocation === 'windows-wsl-gateway');
  const evidenceFile = windows ? 'p2-windows-runtime.json' : 'p25-runtime.json';
  const runtime = JSON.stringify(report.runtime ?? {}).replace(/[<>`]/g, '');
  let md = `# P2.5 fixed-prompt research\n\nTimestamp: ${report.timestamp}\n\nRuntime metadata (see ${evidenceFile} for runtime observations): ${runtime}\n\nDataset: ${report.dataset.hash}; ${report.dataset.count} frozen cases.\n\nAttempted: ${run.attempted}/${run.requested}; schema-valid completed outputs: ${validRaw.length}; status: ${status}. Product admission: false.\n\nTimeouts: ${run.raw.filter(c => c.error?.code === 'TIMEOUT').length}; schema failures: ${run.raw.filter(c => c.error?.code === 'SCHEMA_MISMATCH').length}; invalid JSON: ${run.raw.filter(c => c.error?.code === 'INVALID_JSON').length}.\n\nProvider failures are non-semantic outcomes. B/C percentages below condition on valid completed outputs; compare coverage before interpreting them. No timeout is silently counted as a semantic mistake or constraint omission. Complete/60 operational yield is distinct from conditional semantic accuracy.\n\n| Pipeline | Coverage | Complete | Intent | Count | Slots | Constraints | Unsupported actions | Evidence | Safe review/block | Completed P50/P95 ms |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;
  const rows: [string, CaseResult[]][] = [
    ['A deterministic', report.methods.find(m => m.method === 'A')?.cases ?? []],
    ['B local LLM + schema', validRaw], ['C independent verification', validVerified],
  ];
  for (const [name, cases] of rows) {
    const s = summarize(cases).overall;
    md += `| ${name} | ${cases.length}/${report.dataset.count} | ${metric(s.complete)} | ${metric(s.intentExact)} | ${metric(s.cardCount)} | ${metric(s.slots)} | ${metric(s.constraintRecall)} | ${metric(s.unsupportedActionRate)} | ${metric(s.evidenceValidity)} | ${metric(s.safeRejection)} | ${s.p50Ms?.toFixed(2) ?? 'N/A'}/${s.p95Ms?.toFixed(2) ?? 'N/A'} |\n`;
  }
  md += '\n| Category | Attempted | Valid completed | Complete/valid | Gold constraints recovered/assessed |\n| --- | --- | --- | --- | --- |\n';
  for (const group of [...new Set(run.raw.map(c => c.group))]) {
    const attempts = run.raw.filter(c => c.group === group);
    const valid = attempts.filter(c => !c.error);
    const s = summarize(valid).overall;
    md += `| ${group} | ${attempts.length} | ${valid.length} | ${metric(s.complete)} | ${metric(s.constraintRecall)} |\n`;
  }
  md += `\nAll-attempt latency P50/P95 (includes timeouts): ${percentile(run.raw.map(c => c.durationMs), .5)?.toFixed(2) ?? 'N/A'}/${percentile(run.raw.map(c => c.durationMs), .95)?.toFixed(2) ?? 'N/A'} ms.\n\nGemma 4B historical strict smoke: 0/8 Full Smoke; its 60-case benchmark was NOT_RUN. It is not a comparable 60-case score.\n\n| Case | Provider error | Provider | Schema | Evidence | Constraint | Semantic | Full | Latency ms |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;
  for (const a of run.assessments) {
    const assessed = !a.error;
    const stage = (v: boolean) => assessed ? (v ? 'PASS' : 'FAIL') : 'NOT_ASSESSED';
    md += `| ${a.id} | ${a.error?.code ?? 'none'} | ${a.providerPass ? 'PASS' : 'FAIL'} | ${a.schemaPass ? 'PASS' : a.error?.code === 'TIMEOUT' ? 'NOT_ASSESSED' : 'FAIL'} | ${stage(a.evidencePass)} | ${stage(a.constraintPass)} | ${stage(a.semanticPass)} | ${a.fullPass ? 'PASS' : 'FAIL'} | ${a.latencyMs.toFixed(2)} |\n`;
  }
  md += '\nInterpretation: verified evidence includes source-grounded review/unresolved records after rejecting model proposals; it does not repair model quotes or erase raw errors. Complete outcomes on gold unknown-input cases are correct abstentions, not completed work cards. Frozen unsupported-anchor metrics can flag benign wording (en-02 determiner difference); see MODEL_EVALUATION.md for human adjudication and constraint scope all versus * limitations.\n';
  return md + '\nSee JSON for each original untrusted proposal, error, interception and draft candidate. No work was executed, no UI was changed and no failed output was confirmed. Safe review/block is not proof of recovered constraints. Consult the matching runtime evidence for GPU participation; host measurements do not establish Hailo/UGen300 performance.\n';
}
