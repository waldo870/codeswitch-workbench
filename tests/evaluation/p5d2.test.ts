import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { extractConstraintsV2, validateP5D2Evidence } from '../../src/evaluation/p5d2-constraints.js';
import { p5d2CalibrationCases, p5d2ValidationCases, p5d2ValidationSha256, P5D2_CALIBRATION_VERSION, P5D2_VALIDATION_VERSION } from '../../src/evaluation/p5d2-contract.js';
import { evaluateP5D2Scenario, runP5D2Evaluation, type P5D2Scenario } from '../../src/evaluation/p5d2-evaluation.js';

const sha = (text: string) => createHash('sha256').update(text).digest('hex');

describe('P5D.2 scoring and constraint contracts', () => {
  it('freezes development calibration separately from new validation', () => {
    expect(P5D2_CALIBRATION_VERSION).toBe('p5d-development-calibration-v1');
    expect(p5d2CalibrationCases).toHaveLength(36);
    expect(p5d2ValidationSha256(p5d2CalibrationCases)).toBe('sha256:7f39e126b193fd200770750dc42f0ac8abeb143208ce266f82d9d148cc97fcde');
    expect(P5D2_VALIDATION_VERSION).toBe('p5d-independent-validation-v4');
    expect(p5d2ValidationCases).toHaveLength(24);
    expect(new Set(p5d2ValidationCases.map(x => x.id)).size).toBe(24);
    for (const category of ['zh-negation', 'en-negation', 'mixed-negation', 'prerequisite', 'multi-intent', 'ambiguous']) {
      expect(p5d2ValidationCases.filter(x => x.category === category)).toHaveLength(4);
    }
    expect(p5d2ValidationSha256(p5d2ValidationCases)).toBe('sha256:05d6846994a6756f6eb47309c5744cd9fda3fd06431f2875b2d67aa8cef5d5b4');
    expect(p5d2ValidationSha256(p5d2ValidationCases)).toBe('sha256:05d6846994a6756f6eb47309c5744cd9fda3fd06431f2875b2d67aa8cef5d5b4');
  });

  it('corrects the five historical complete-success false positives without changing v1 artifacts', async () => {
    const paths = ['reports/p5d-baseline.json', 'reports/p5d-final.json', 'reports/p5d-baseline.md', 'reports/p5d-final.md', 'tests/fixtures/p5d-safety-v1.json'];
    const before = await Promise.all(paths.map(async path => sha(await readFile(path, 'utf8'))));
    const [baseline, final, result] = await Promise.all([
      readFile(paths[0]!, 'utf8').then(JSON.parse) as Promise<{ cases: Array<{ sourceCaseId: string; kind: string; completeWorkflowSuccess: boolean }> }>,
      readFile(paths[1]!, 'utf8').then(JSON.parse) as Promise<{ cases: Array<{ sourceCaseId: string; kind: string; completeWorkflowSuccess: boolean }> }>,
      runP5D2Evaluation({ generatedAt: 'test' }),
    ]);
    const falsePositiveIds = ['precondition-exception-001', 'precondition-exception-002', 'precondition-exception-003', 'precondition-exception-004', 'multi-intent-ambiguous-004'];
    expect(falsePositiveIds.slice(0, 4).every(id => baseline.cases.find(x => x.sourceCaseId === id && x.kind === 'original')?.completeWorkflowSuccess)).toBe(true);
    expect(baseline.cases.find(x => x.sourceCaseId === falsePositiveIds[4] && x.kind === 'original')?.completeWorkflowSuccess).toBe(true);
    expect(final.cases.filter(x => x.kind === 'original' && x.completeWorkflowSuccess)).toHaveLength(27);
    expect(result.historicalScoringComparison).toMatchObject({ scoringV1: { baselineComplete: '32/100', finalComplete: '27/100' }, scoringV2: { baselineComplete: '27/100', finalComplete: '27/100' } });
    expect(result.heldOutCandidateEvaluation).toBe('NOT_RUN');
    expect(result.developmentDataset).toMatchObject({ total: 400, developmentRows: 240, developmentOriginals: 60, historicalHeldOutRows: 160, historicalHeldOutUsedForTuning: false });
    expect(await Promise.all(paths.map(async path => sha(await readFile(path, 'utf8'))))).toEqual(before);
  });

  it('represents bilingual prohibition, scope, and prerequisite direction with source spans', () => {
    const input = '除非我確認，否則不要 deploy to production；check sandbox credentials';
    const result = extractConstraintsV2(input);
    expect(result.constraints).toHaveLength(1);
    expect(result.constraints[0]).toMatchObject({ action: 'deploy', polarity: 'prohibited', scope: 'production', prerequisite: { relation: 'prohibited_unless', predicate: 'user confirmation' } });
    expect(validateP5D2Evidence(input, result.constraints[0]!.evidence)).toBe(true);
    expect(validateP5D2Evidence(input, result.constraints[0]!.prerequisite!.evidence)).toBe(true);
  });

  it('keeps prerequisite direction explicit and leaves unknown conditions unresolved', () => {
    const until = extractConstraintsV2('Do not publish the release until I confirm');
    expect(until.constraints[0]?.prerequisite?.relation).toBe('prohibited_until');
    expect(extractConstraintsV2('Do not run it after that').unresolved.length).toBeGreaterThan(0);
  });

  it('separates recognizing a constraint from matching its scope', () => {
    const result = evaluateP5D2Scenario({
      id: 'scope-counterexample', split: 'new-validation', kind: 'original', category: 'en-negation',
      input: "Don't deploy to staging; check sandbox credentials",
      expectedIntents: [{ type: 'task', action: 'check', target: 'sandbox credentials' }],
      expectedConstraints: [{ action: 'deploy', polarity: 'prohibited', scope: 'production' }], expectedPrerequisites: [], expectsUnresolved: false,
    });
    expect(result.constraintRecall).toEqual({ numerator: 1, denominator: 1 });
    expect(result.scopeAccuracy).toEqual({ numerator: 0, denominator: 1 });
    expect(result.unsupportedConstraints).toEqual({ numerator: 1, denominator: 1 });
    expect(result.completeWorkflowSuccess).toBe(false);
  });

  it('uses JavaScript UTF-16 offsets for evidence around supplementary characters', () => {
    const input = '😀 不要 deploy to production';
    const item = extractConstraintsV2(input).constraints[0]!;
    expect(item.evidence.start).toBe(input.indexOf('不要'));
    expect(item.evidence.text).toBe(input.slice(item.evidence.start, item.evidence.end));
    expect(validateP5D2Evidence(input, item.evidence)).toBe(true);
  });

  it('retains a safe independent draft, blocks a conflicting card, and never confirms or executes', () => {
    const scenario: P5D2Scenario = {
      id: 'review-prototype-counterexample', split: 'new-validation', kind: 'original', category: 'multi-intent',
      input: 'Deploy to production; check sandbox credentials; do not deploy to production',
      expectedIntents: [{ type: 'task', action: 'deploy', target: 'production' }, { type: 'task', action: 'check', target: 'sandbox credentials' }],
      expectedConstraints: [{ action: 'deploy', polarity: 'prohibited', scope: 'production' }], expectedPrerequisites: [], expectsUnresolved: false,
    };
    const result = evaluateP5D2Scenario(scenario);
    expect(result.blockedCardIds).toEqual(['card-1']);
    expect(result.retainedCards).toHaveLength(1);
    expect(result.retainedCards[0]).toMatchObject({ title: 'Check sandbox credentials', status: 'draft', requiresConfirmation: true });
    expect(result.retainedCards[0]?.evidence.text).toBe('check sandbox credentials');
    expect(result.workspaceStatus).toBe('REVIEW_REQUIRED');
    expect(result.completeWorkflowSuccess).toBe(false);
    expect(result.retainedCards.every(x => x.status === 'draft' && x.requiresConfirmation)).toBe(true);
  });

  it('reports independent validation separately and never evaluates historical held-out candidates', async () => {
    const report = await runP5D2Evaluation({ generatedAt: 'test' });
    expect(report.developmentCalibration).toMatchObject({ cases: 66, usedForTuning: true });
    expect(report.independentValidation).toMatchObject({ version: 'p5d-independent-validation-v4', cases: 24, usedForTuning: false });
    expect(report.independentValidationMetrics.completeSuccess.denominator).toBe(24);
    expect(report.development.completeSuccess.denominator).toBe(60);
    expect(report.heldOutCandidateEvaluation).toBe('NOT_RUN');
    expect(report.products).toEqual({ p1Integration: false, automaticConfirmation: false, execution: false });
    expect(report.cases.development.every(x => x.split === 'development')).toBe(true);
  });
});
