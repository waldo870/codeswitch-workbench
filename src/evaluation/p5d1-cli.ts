import { analyzeP5D1, loadP5D1Inputs, writeP5D1Reports } from './p5d1-analysis.js';

async function main():Promise<void>{
 const {baseline,final,dataset}=await loadP5D1Inputs();
 const report=analyzeP5D1(baseline,final,dataset);
 await writeP5D1Reports(report);
 console.log(`P5D.1 attribution: ${report.overall.originals} originals, ${report.overall.synthetic} synthetic variants; audited baseline ${report.overall.baselineCompleteAudited}/${report.overall.originals}; final ${report.overall.finalCompleteReported}/${report.overall.originals}; held-out tuning: none.`);
}
if(import.meta.url===new URL(`file://${process.argv[1]}`).href)main().catch(error=>{console.error(error instanceof Error?error.message:'P5D.1 analysis failed.');process.exitCode=1;});
