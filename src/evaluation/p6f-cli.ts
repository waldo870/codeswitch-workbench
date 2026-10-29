import { readFile, writeFile } from 'node:fs/promises';
import { evaluateP6F, P6F_SCENARIOS, renderP6FMarkdown } from './p6f-workflow.js';

const inputPath=process.argv[2];
let observations:unknown[]=[];
if(inputPath){const parsed:unknown=JSON.parse(await readFile(inputPath,'utf8'));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||!('observations' in parsed)||!Array.isArray((parsed as {observations?:unknown}).observations))throw new Error('Input JSON must contain an observations array.');observations=(parsed as {observations:unknown[]}).observations;}
const report=evaluateP6F({schemaVersion:1,scenarios:P6F_SCENARIOS,observations});
await writeFile('reports/p6f-workflow-evaluation.json',JSON.stringify(report,null,2)+'\n');
await writeFile('reports/p6f-workflow-evaluation.md',renderP6FMarkdown(report));
console.log(`P6F status: ${report.status}`);
console.log(`Human observations: ${report.observations.length}`);
console.log('Reports: reports/p6f-workflow-evaluation.json, reports/p6f-workflow-evaluation.md');
