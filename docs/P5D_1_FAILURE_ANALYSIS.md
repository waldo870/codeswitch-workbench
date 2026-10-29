# P5D.1 Failure Analysis

## Scope and integrity

This report analyzes the committed P5D v1 fixture and the existing `reports/p5d-baseline.*` and `reports/p5d-final.*` artifacts. P5D.1 does not edit those reports, the 100 source instructions, 300 synthetic variants, or their Gold Labels. Dataset SHA-256 remains `sha256:696f86d9865e5aecace2bab0d01c09d0b5b2d7e49195e7c1b4c110c0e7a1a86a`.

No P5D gate or parser change is connected to P1. The development-only per-card retention experiment is an offline simulation; it does not confirm or execute cards. No Windows Whisper, LM Studio, ROCm, or Hailo component changed.

## Main finding: the apparent complete-success regression is a scorer issue

The original report says baseline complete success is 32/100 and final is 27/100. The 5-row difference is not 5 correctly understood workflows rejected by the gate:

- Four reported baseline successes (`precondition-exception-001` through `-004`) have Gold dependency metadata, but the extraction proposal has no direction-bearing dependency field. The P0 parser leaves the condition as unresolved text. P5D's original complete-success scorer checks intent, constraint tuple, evidence and unresolved handling, but never checks whether the dependency direction was represented. These are scorer false positives, not valid baseline successes.
- One row (`multi-intent-ambiguous-004`) has zero expected actionable intents and an unresolved clause. Exact matching treats an empty expected and predicted intent set as success. A constraint plus unresolved text is not a completed task workflow.

After excluding those five scoring false positives, the baseline is 27/100, equal to the final 27/100. The strict gate blocked 73 original cases. Of those, 68 had an unextracted Gold constraint and five were the above scorer false positives. No audited-complete baseline row was blocked. Thus the reported 32→27 drop is explained by the benchmark's missing prerequisite/actionability checks, not a demonstrated loss of five valid completed workflows.

The gate still causes substantial whole-utterance draft loss: in Development, it blocks 43/60 cases even though the parser's task intents are exact in 60/60. In those 43 blocked cases, however, 39 also miss the prohibited constraint and four lack prerequisite direction. Correct task extraction alone does not make the full proposal safe or complete.

## Constraint, scope, and evidence attribution

On original instructions, 32/100 constraints are extracted with exact action, polarity and scope; 68/100 are missed (Development 21/60 exact, 39/60 missed; historical held-out 11/40 exact, 29/40 missed). There are zero observed scope-only errors among recognized constraints. The aggregate scope metric equals recall because every missed constraint is counted against both measures; it should not be described as 68 wrong-scope predictions.

The main grammar gaps in the 12 P4G drafts are missing prohibition/action combinations: `不得刪除` / `Never delete`, `請勿寄送` / `Must not send`, and `不可以發布` / `Do not publish`. These are unverified benchmark observations, not confirmed production defects. All 12 remain draft and require human review.

Evidence offsets validate for 845/845 recorded proposal evidence items. This is only a location check: it does not prove that a span semantically entails an action or prohibition. The 68 missing constraints are semantic coverage failures even though related source text remains locatable as an unresolved segment. No offset-invalid case was found in the recorded P5D results.

The Gold dependency data has 20 original cases, but the proposal schema has no dependency relation; 0/20 relation directions are represented. Consequently, the 4 baseline-complete precondition rows were incorrectly counted as complete. A future versioned benchmark should add direction-specific expected slots and require evidence for both condition and constrained action. Do not rewrite the existing P5D Gold or scores.

## Negation deletion and multi-intent behavior

There are 100 negation-deletion variants. The raw parser produces 20 affirmative flips; the existing final gate blocks five, while 15 are not blocked because the damaged text now directly says an affirmative action such as “deploy to production”. Those 15 are class E input corruption: the removed negative token cannot be recovered from text. They remain unconfirmed drafts; this result is not evidence that a parser can restore the original meaning.

All 100 original task-intent sets are exact. The strict gate blocks unrelated supported task drafts whenever a prohibition is unresolved, as it blocks the whole utterance rather than isolating the risky clause. This is a usability cost, but the parser's missing constraint still requires review. In the Development-only candidate simulation, validated non-conflicting task cards remain drafts with a review-required state while unresolved risk text remains visible. It retains at least one draft in 60/60 Development cases, including 43 cases blocked by the strict gate. This is a candidate workflow only; it is not product-approved, was not run on held-out data, and does not increase complete-workflow success.

The historical held-out split was not reclassified as a new blind set. During initial implementation, a shared summarizer briefly computed exploratory per-card candidate counts for held-out before the split boundary was corrected. Those values were discarded, were not used to change rules or decisions, and are excluded from this report. The final analysis marks held-out candidate evaluation `NOT_RUN` and uses held-out only to restate the historical P5D comparison.

## Minimal counterexamples

| Case | Failure | Minimum repair to research |
| --- | --- | --- |
| `zh-prohibition-009` — “不得刪除日誌，檢查測試設定” | Check-task intent and evidence are valid, but the parser misses the “不得刪除” prohibition. The strict gate blocks the full result. | Add the exact action/polarity pair to a grammar matrix; preserve the prohibition as a constraint and never turn it into a positive task. |
| `precondition-exception-001` — “Unless I confirm, don't deploy to production，check sandbox credentials” | Prohibition action/scope are extracted, but “unless I confirm” remains unresolved; no direction relation links confirmation to deploy. | Extend the proposal contract with typed prerequisite direction and separately grounded condition/action evidence. |
| `en-prohibition-001--negation_deletion` — “ deploy to production, check sandbox credentials” | Synthetic negation deletion changes the observed text into an affirmative action. | Do not infer the missing prohibition; preserve uncertainty through source/audio alternatives if available and keep human review. |
| `multi-intent-ambiguous-004` — “Don't deploy to production，check it later” | No actionable task is extracted, but the old scorer counted an empty intent set as exact completion. | Require actionable expected intents (or an explicitly expected safe-reject outcome) for complete workflow success. |

## Development-only experiment and next design

The only improvement experiment was on the 60 Development originals. It retains independently validated, non-conflicting cards as draft proposals and marks the full result review-required when unresolved clauses or constraints remain. It recovers draft visibility in 43 cases that strict mode blocks, while preserving the parser's unresolved content and confirmation requirement. It does not interpret missing constraints, reduce the underlying 39/60 Development constraint misses, or authorize confirmation/export.

Recommended implementation order for a future separately approved phase:

1. Version a constraint grammar table for polarity, action, scope, and supported language variants; derive tests from Development cases.
2. Add a dependency-direction contract with source spans for both condition and action; treat ambiguous direction as unresolved.
3. Separate evidence location validity from semantic coverage and constraint recall.
4. Consider per-card quarantine with a visible workspace-level review-required status instead of dropping every unrelated draft. Keep unresolved risk visible and block confirmation/export until the user resolves it.
5. Correct complete-success scoring in a new benchmark version. Preserve existing P5D scores as historical evidence.

No independent validation set was created because no parser or product behavior was changed. If any proposed rule is implemented, first freeze the Development change and evaluate it on a newly authored, separately hashed validation set. The old 40 held-out cases remain historical comparison only.

## Reproduction

```bash
pnpm analyze:p5d1
pnpm test -- tests/evaluation/p5d1-analysis.test.ts
```

`reports/p5d1-failure-analysis.json` contains per-split attribution, P4G draft classifications, Development candidate counts and counterexamples. It includes no Live ASR claim.
