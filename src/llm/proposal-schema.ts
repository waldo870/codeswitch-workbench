import { Ajv } from 'ajv';
import type { Proposal } from './types.js';
const text = { type: 'string', minLength: 1, maxLength: 10000 };
const nullable = { anyOf: [text, { type: 'null' }] };
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
const card = (type: string, fields: Record<string, unknown>) => object({
  intent: { const: type }, type: { const: type }, title: text, fields: object(fields), evidence: text,
  status: { type: 'string', maxLength: 30 }, requiresConfirmation: { type: 'boolean' },
}, ['intent', 'type', 'title', 'fields', 'evidence']);
export const proposalSchema = object({
  cards: { type: 'array', maxItems: 30, items: { oneOf: [
    card('task', { action: text, target: text }),
    card('calendar', { action: text, target: text, time: nullable }),
    card('email_draft', { action: { const: 'draft' }, recipientName: nullable, recipientEmail: nullable, language: nullable, body: { type: 'null' } }),
  ] } },
  constraints: { type: 'array', maxItems: 30, items: object({ action: text, polarity: { enum: ['required', 'prohibited', 'prerequisite'] }, scope: text, dependsOn: nullable, evidence: text }) },
  unresolved: { type: 'array', maxItems: 30, items: object({ evidence: text, reason: text }) },
});
const check = new Ajv({ allErrors: true, strict: true }).compile<Proposal>(proposalSchema);
export function validateSchema(value: unknown): { valid: boolean; errors: string[] } {
  const valid = check(value);
  return { valid, errors: valid ? [] : (check.errors ?? []).map(e => `${e.instancePath || '/'} ${e.message}`) };
}
