import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { GoldExample } from './scoring.js';
export const datasetUrl = new URL('../../tests/fixtures/benchmark-v1.json', import.meta.url);
export function loadDataset() {
  const bytes = readFileSync(datasetUrl);
  const manifest = JSON.parse(readFileSync(new URL('../../tests/fixtures/benchmark-v1.manifest.json', import.meta.url), 'utf8')) as { version: string; sha256: string; count: number; groups: Record<string, number> };
  const hash = createHash('sha256').update(bytes).digest('hex');
  const dataset = JSON.parse(bytes.toString('utf8')) as { version: string; examples: GoldExample[] };
  if (hash !== manifest.sha256 || dataset.version !== manifest.version || dataset.examples.length !== manifest.count) throw new Error('Dataset version/hash/count mismatch. Do not silently change gold labels.');
  if (new Set(dataset.examples.map(x => x.id)).size !== dataset.examples.length) throw new Error('Duplicate example IDs.');
  for (const [group, count] of Object.entries(manifest.groups)) if (dataset.examples.filter(e => e.group === group).length !== count) throw new Error('Invalid group counts.');
  for (const e of dataset.examples) if (e.expectedSlots.length !== e.expectedCardCount || e.expectedSlots.length > 8 || JSON.stringify([...new Set(e.expectedSlots.map(c => c.type))].sort()) !== JSON.stringify(e.expectedIntentTypes)) throw new Error('Inconsistent gold labels.');
  return { ...dataset, hash };
}
