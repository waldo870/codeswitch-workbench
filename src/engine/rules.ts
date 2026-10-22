import type { Constraint, Evidence, WorkCard } from '../contracts/work-card.js';
export type Meaning = { card: Omit<WorkCard, 'id' | 'status' | 'requiresConfirmation' | 'evidence'> } | { constraint: Omit<Constraint, 'evidence'> };
// Offsets remain UTF-16 code-unit indexes, including astral characters.
export function segments(input: string): Evidence[] {
  const result: Evidence[] = [];
  const separator = /[,，。!！?？;；\n]|\.(?=\s|$)|\b(?:but|then|and then)\b|然後/gi;
  let start = 0;
  const append = (end: number) => {
    const raw = input.slice(start, end);
    const prefix = raw.match(/^[\s「」]*(?:(?:先|請)|please\s+)?\s*/i)?.[0].length ?? 0;
    const text = raw.slice(prefix).replace(/[\s「」]+$/, '');
    if (text) result.push({ text, start: start + prefix, end: start + prefix + text.length });
  };
  for (const match of input.matchAll(separator)) { append(match.index); start = match.index + match[0].length; }
  append(input.length);
  return result;
}
const targets: Record<string, string> = {
  'payment webhook': 'payment webhook', 'sandbox credentials': 'sandbox credentials',
  'sandbox': 'sandbox', 'production settings': 'production settings',
  'deployment plan': 'deployment plan', '報告': '報告', '測試設定': '測試設定',
  'production': 'production', 'staging': 'staging',
};
const actions: Record<string, string> = { review: 'review', check: 'check', deploy: 'deploy', '檢查': 'check', '審查': 'review', '部署': 'deploy' };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export function interpret(text: string): Meaning | null {
  const negative = text.match(/^(?:do not|don't|不要|禁止)\s*(deploy|部署|send|寄送)(?:\s+(?:to\s+)?(production|staging|it)|到(正式環境|測試環境))?(?:\s+yet)?$/i);
  const required = text.match(/^(?:must|必須)\s*(check|檢查)\s*(sandbox credentials|sandbox|測試設定)$/i);
  if (negative) {
    const verb = negative[1]!.toLowerCase();
    const scope = negative[2]?.toLowerCase() ?? negative[3] ?? '*';
    return { constraint: { action: /send|寄送/.test(verb) ? 'send' : 'deploy', polarity: 'prohibited', scope: scope === '正式環境' ? 'production' : scope === '測試環境' ? 'staging' : scope === 'it' ? '*' : scope } };
  }
  if (required) return { constraint: { action: 'check', polarity: 'required', scope: required[2]!.toLowerCase() } };
  const email = text.match(/^draft (?:an? )?(?:(English|Chinese) )?(follow-up )?email(?: to ([A-Za-z]+))?$/i);
  if (email) {
    const language = email[1] ? cap(email[1].toLowerCase()) : null;
    const name = email[3] ?? null;
    return { card: { type: 'email_draft', title: `Prepare ${language ? language + ' ' : ''}${email[2] ? 'follow-up ' : ''}email${name ? ' to ' + name : ''}`, fields: { action: 'draft', recipientName: name, recipientEmail: null, language, body: null } } };
  }
  let rest = text;
  let time: string | null = null;
  let calendar = false;
  const timed = rest.match(/^(明天早上九點|明天|tomorrow(?: at 9(?::00)? am)?)\s*/i);
  if (timed) { calendar = true; time = /九點|9/.test(timed[1]!) ? 'Tomorrow, 9:00 AM' : 'Tomorrow (time unknown)'; rest = rest.slice(timed[0].length); }
  const remind = rest.match(/^remind me to\s+/i);
  if (remind) { calendar = true; rest = rest.slice(remind[0].length); }
  const operation = rest.match(/^(review|check|deploy|檢查|審查|部署)\s*(?:to\s+)?(.+)$/i);
  if (!operation) return null;
  const action = actions[operation[1]!.toLowerCase()]!;
  const target = targets[operation[2]!.toLowerCase().replace(/^the /, '')];
  if (!target || (action === 'deploy' && !['production', 'staging'].includes(target)) || (action !== 'deploy' && ['production', 'staging'].includes(target))) return null;
  return { card: { type: calendar ? 'calendar' : 'task', title: `${cap(action)} ${target}`, fields: calendar ? { action, target, time } : { action, target } } };
}
