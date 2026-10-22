import type { Evidence, WorkCard } from '../contracts/work-card.js';
import type { Proposal, ProposalConstraint, ProposalCard, Verification } from './types.js';
import { validateSchema } from './proposal-schema.js';
export function groundEvidence(input: string, text: string): { evidence: Evidence | null; error: string | null } {
  if (!text) return { evidence: null, error: 'missing_evidence' };
  const start = input.indexOf(text);
  if (start < 0) return { evidence: null, error: 'fabricated_evidence' };
  if (input.indexOf(text, start + 1) >= 0) return { evidence: null, error: 'ambiguous_evidence' };
  return { evidence: { text, start, end: start + text.length }, error: null };
}
export const normalize = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
export const constraintKey = (c: Pick<ProposalConstraint, 'action' | 'scope' | 'polarity' | 'dependsOn'>) => [c.polarity, normalize(c.action), normalize(c.scope), c.dependsOn ? normalize(c.dependsOn) : ''].join('|');
// Independent finite scanner. It does not consume model predictions or benchmark labels.
export function scanConstraints(input: string): ProposalConstraint[] {
  const found: ProposalConstraint[] = [];
  const add = (action: string, scope: string, polarity: ProposalConstraint['polarity'], dependsOn: string | null, evidence: string) => {
    const c = { action, scope, polarity, dependsOn, evidence };
    if (!found.some(x => constraintKey(x) === constraintKey(c))) found.push(c);
  };
  const aliases: Record<string, string> = { 部署: 'deploy', 寄送: 'send', 刪除: 'delete', 發布: 'publish', 執行: 'execute' };
  const re = /(?:don't|do not|不要|禁止)\s*(deploy|send|delete|publish|execute|部署|寄送|刪除|發布|執行)(?:\s+(?:to\s+|the\s+)?(production|staging|logs|it))?(?:\s+yet)?/gi;
  for (const m of input.matchAll(re)) add(aliases[m[1]!] ?? m[1]!.toLowerCase(), m[2] && m[2].toLowerCase() !== 'it' ? m[2].toLowerCase() : '*', 'prohibited', null, m[0]);
  for (const m of input.matchAll(/不能直接上\s*production/gi)) add('deploy', 'production', 'prohibited', null, m[0]);
  for (const m of input.matchAll(/only prepare a draft(?: email)?/gi)) add('send', '*', 'prohibited', null, m[0]);
  for (const m of input.matchAll(/先檢查再執行/g)) add('execute', '*', 'prerequisite', 'check', m[0]);
  for (const m of input.matchAll(/unless I confirm,\s*(?:do not|don't) publish/gi)) add('publish', '*', 'prerequisite', 'user confirmation', m[0]);
  for (const m of input.matchAll(/除非我確認，否則不要發布/g)) add('publish', '*', 'prerequisite', 'user confirmation', m[0]);
  for (const m of input.matchAll(/(?:must|必須)\s*(?:check|檢查)\s*(sandbox(?: credentials)?|測試設定)/gi)) add('check', normalize(m[1]!), 'required', null, m[0]);
  for (const m of input.matchAll(/check\s+(sandbox(?: credentials)?)\s+before\s+deploy\s+to\s+(production|staging)/gi)) add('deploy', normalize(m[2]!), 'prerequisite', `check ${normalize(m[1]!)}`, m[0]);
  return found;
}
const actionWords: Record<string, RegExp> = { check: /\bcheck\b|檢查|核對/i, review: /\breview\b|審查/i, draft: /\bdraft\b|草擬/i, deploy: /\bdeploy\b|部署/i, send: /\bsend\b|寄送/i, delete: /\bdelete\b|刪除/i, publish: /\bpublish\b|發布/i, execute: /\bexecute\b|執行/i, organize: /\borganize\b|整理/i, discuss: /\bdiscuss\b|討論/i, audit: /\baudit\b|稽核/i, summarize: /\bsummarize\b|摘要/i, prepare: /\bprepare\b|準備/i };
function supportedValue(source: string, value: string | null): boolean { return value === null || normalize(source).includes(normalize(value)); }
function supportedTime(source: string, time: string | null): boolean {
  if (time === null) return true;
  if (time === 'Tomorrow, 9:00 AM') return /明天(?:早上)?九點|tomorrow at 9(?::00)? am/i.test(source);
  if (time === 'Tomorrow (time unknown)') return /明天|tomorrow/i.test(source) && !/九點|9(?::00)? am/i.test(source);
  return supportedValue(source, time);
}
export function missingRequired(card: ProposalCard): boolean {
  if (card.type === 'email_draft') return !card.fields.recipientName || !card.fields.recipientEmail || !card.fields.language;
  if (card.type === 'calendar') return !card.fields.time || /unknown|下週一|下週二|週三下午/.test(card.fields.time);
  return !card.fields.action || !card.fields.target;
}
export function verifyProposal(input: string, value: unknown): Verification {
  const errors: string[] = [], draftCards: WorkCard[] = [], groundedConstraints: Verification['groundedConstraints'] = [], groundedUnresolved: Verification['groundedUnresolved'] = [];
  const finish = (): Verification => ({ valid: errors.length === 0, errors, reviewRequired: true, executable: false, draftCards: errors.length ? [] : draftCards, groundedConstraints, groundedUnresolved });
  if (!validateSchema(value).valid) { errors.push('schema_mismatch'); return finish(); }
  const proposal = value as Proposal;
  const expected = scanConstraints(input);
  for (const c of expected) if (!proposal.constraints.some(p => constraintKey(p) === constraintKey(c))) errors.push(`omitted_constraint:${constraintKey(c)}`);
  const covered = new Uint8Array(input.length);
  function ground(text: string) {
    const result = groundEvidence(input, text);
    if (result.error) errors.push(result.error);
    if (result.evidence) covered.fill(1, result.evidence.start, result.evidence.end);
    return result.evidence;
  }
  for (const c of proposal.constraints) {
    const evidence = ground(c.evidence);
    const supported = expected.some(e => constraintKey(e) === constraintKey(c) && c.evidence.includes(e.evidence));
    if (!supported) errors.push(`unverified_constraint:${constraintKey(c)}`);
    if (evidence && supported) groundedConstraints.push({ ...c, evidence });
  }
  for (const u of proposal.unresolved) { const evidence = ground(u.evidence); if (evidence) groundedUnresolved.push({ ...u, evidence }); }
  for (const [index, c] of proposal.cards.entries()) {
    const evidence = ground(c.evidence);
    const action = normalize(c.fields.action);
    const word = Object.hasOwn(actionWords, action) ? actionWords[action] : undefined;
    if (!word?.test(c.evidence)) errors.push(`unsupported_action:${index}`);
    if (/don't|do not|不要|禁止|不能|unless|除非/i.test(c.evidence)) errors.push(`negated_or_conditional_card:${index}`);
    if (/[,，;；。]|\bthen\b|然後/.test(c.evidence.replace(/[。.;；]+$/, ''))) errors.push(`multi_clause_card_evidence:${index}`);
    if (!word?.test(c.title) || ['deploy', 'send', 'delete', 'publish', 'execute'].some(other => other !== action && actionWords[other]!.test(c.title))) errors.push(`unverified_title:${index}`);
    if (c.type === 'email_draft') {
      for (const field of ['recipientName', 'recipientEmail'] as const) if (!supportedValue(c.evidence, c.fields[field])) errors.push(`unsupported_slot:${index}:${field}`);
      const lang = c.fields.language;
      if (lang !== null && !(lang === 'English' && /English|英文/i.test(c.evidence)) && !(lang === 'Chinese' && /Chinese|中文/i.test(c.evidence))) errors.push(`unsupported_slot:${index}:language`);
    } else {
      if (!supportedValue(c.evidence, c.fields.target)) errors.push(`unsupported_slot:${index}:target`);
      if (c.type === 'calendar' && !supportedTime(c.evidence, c.fields.time)) errors.push(`unsupported_slot:${index}:time`);
      for (const constraint of expected) if (constraint.action === action && (constraint.scope === '*' || normalize(c.fields.target) === normalize(constraint.scope)) && constraint.polarity !== 'required') errors.push(`constraint_conflict:${index}:${constraintKey(constraint)}`);
    }
    if (missingRequired(c)) errors.push(`missing_required:${index}`);
    if (evidence) draftCards.push({ id: `proposal-${index + 1}`, type: c.type, title: c.title, fields: c.fields, status: 'draft', requiresConfirmation: true, evidence } as WorkCard);
  }
  const remaining = [...input].length ? input.split('').map((ch, i) => covered[i] ? ' ' : ch).join('') : '';
  if (remaining.replace(/\b(?:please|but|then|and)\b|然後|請|先|[\s,，。.;；!！?？「」]/gi, '').length) errors.push('unverified_source_coverage');
  if (proposal.unresolved.length) errors.push('unresolved_source');
  if (expected.some(c => c.polarity === 'prerequisite')) errors.push('unfulfilled_prerequisite');
  return finish();
}
