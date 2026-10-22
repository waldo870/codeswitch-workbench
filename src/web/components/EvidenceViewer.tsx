import type { Evidence } from '../../contracts/work-card.js';
export function EvidenceViewer({ input, evidence }: { input: string; evidence: Evidence }) {
  return <details><summary>Original evidence · UTF-16 [{evidence.start}, {evidence.end})</summary>
    <p className="evidence">{input.slice(0, evidence.start)}<mark>{input.slice(evidence.start, evidence.end)}</mark>{input.slice(evidence.end)}</p>
    <p className="muted">This source supports the original extraction. User edits are recorded separately.</p>
  </details>;
}
