import { runP5D2Evaluation, writeP5D2Report } from './p5d2-evaluation.js';

const report = await runP5D2Evaluation();
await writeP5D2Report(report);
console.log(`P5D.2 ${report.status}`);
console.log(`Development: ${report.development.completeSuccess.numerator}/${report.development.completeSuccess.denominator} complete successes`);
console.log(`Independent validation: ${report.independentValidationMetrics.completeSuccess.numerator}/${report.independentValidationMetrics.completeSuccess.denominator} complete successes`);
console.log(`Held-out candidate evaluation: ${report.heldOutCandidateEvaluation}`);
console.log('Reports: reports/p5d2-evaluation.json, reports/p5d2-evaluation.md');
