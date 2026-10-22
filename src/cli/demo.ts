import { readFileSync } from 'node:fs';
import { extract, validate } from '../index.js';
try {
  const input = readFileSync(new URL('../../examples/sample-input.txt', import.meta.url), 'utf8').trim();
  const result = extract(input);
  const validation = validate(input, result);
  console.log(JSON.stringify({ input, ...result, validation }, null, 2));
  console.log(`Work cards: ${result.cards.length}; Constraints: ${result.constraints.length}; Validation: ${validation.valid ? 'PASS' : 'FAIL'}`);
  if (!validation.valid) process.exitCode = 1;
} catch (error) { console.error(error); process.exitCode = 1; }
