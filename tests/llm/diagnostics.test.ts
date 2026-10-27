import { expect, it } from 'vitest';
import { redactDiagnostic, DIAGNOSTIC_LIMIT } from '../../src/llm/diagnostics.js';
it('redacts nested structured credentials and plaintext bearer credentials before truncation', () => {
  const source = JSON.stringify({ Authorization: 'Bearer private-123', nested: [{ password: 'do-not-store', access_token: 'do-not-store-token' }], harmless: 'Bearer another-secret-456 sk-secret-123456789' });
  const text = redactDiagnostic(source); expect(text).not.toMatch(/private-123|do-not-store|another-secret|sk-secret/); expect(text).toContain('REDACTED');
  expect(redactDiagnostic('x'.repeat(10000)).length).toBeLessThanOrEqual(DIAGNOSTIC_LIMIT + 12);
});
it('redacts recognizable secrets even in malformed provider JSON', () => {
  expect(redactDiagnostic('{"password":"secret-password", "broken":')).not.toContain('secret-password');
});
