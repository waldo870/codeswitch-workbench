import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildP5DBaselineReport, buildP5DFinalReport, loadOrWriteP5DFixture, renderP5DMarkdown } from './p5d-evaluation.js';

async function main():Promise<void>{
 const mode=process.argv[2];
 if(mode!=='baseline'&&mode!=='final')throw new Error('Usage: p5d-cli.ts baseline|final');
 await loadOrWriteP5DFixture();
 const report=mode==='baseline'?buildP5DBaselineReport():buildP5DFinalReport();
 await mkdir(resolve('reports'),{recursive:true});
 const stem=mode==='baseline'?'p5d-baseline':'p5d-final';
 await writeFile(resolve(`reports/${stem}.json`),JSON.stringify(report,null,2)+'\n');
 await writeFile(resolve(`reports/${stem}.md`),renderP5DMarkdown(report));
 const dev=report.metrics.development;
 console.log(`P5D ${report.mode}: ${report.counts.originals} originals, ${report.counts.synthetic} synthetic variants; Development only: intent exact ${dev.intentExactMatch.numerator}/${dev.intentExactMatch.denominator}, constraint recall ${dev.constraintRecall.numerator}/${dev.constraintRecall.denominator}, negation flips ${dev.negationFlipRate.numerator}/${dev.negationFlipRate.denominator}.`);
}

if(import.meta.url===new URL(`file://${process.argv[1]}`).href)main().catch(error=>{console.error(error instanceof Error?error.message:'P5D benchmark failed.');process.exitCode=1;});
