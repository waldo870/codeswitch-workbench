import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { evaluateP6G, P6G_SCENARIOS, renderP6GMarkdown, validateP6GInput } from './p6g-evaluation.js';

const arg=process.argv.slice(2).find(value=>value.startsWith('--observations='));
let observations:unknown[]=[];
if(arg){
  const path=resolve(arg.slice('--observations='.length));
  if((await stat(path)).size>4_000_000)throw new Error('Human-observation input exceeds the 4 MB limit.');
  const parsed:unknown=JSON.parse(await readFile(path,'utf8'));
  observations=validateP6GInput(parsed).observations;
}
const report=evaluateP6G({schemaVersion:1,scenarios:P6G_SCENARIOS,observations});
await mkdir('reports',{recursive:true});
await writeFile('reports/p6g-evaluation.json',`${JSON.stringify(report,null,2)}\n`);
await writeFile('reports/p6g-evaluation.md',renderP6GMarkdown(report));
process.stdout.write(`P6G evaluation: ${report.status}; ${report.observations.length} human observation(s).\n`);
