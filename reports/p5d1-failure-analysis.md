# P5D.1 Failure Attribution and Minimal Improvement Study

- Status: ATTRIBUTION_RESEARCH_ONLY
- Dataset: p5d-safety-v1; SHA-256: sha256:696f86d9865e5aecace2bab0d01c09d0b5b2d7e49195e7c1b4c110c0e7a1a86a
- Existing P5D reports and fixture modified: no
- Live ASR: no; this is text-only synthetic data
- Held-out used for tuning: no

## Original-case attribution

| Split | Cases | Intent exact | Correct intents but gate blocked | Constraints fully extracted | Constraint misses | Strict gate blocks | Reported baseline complete | Blocked reported complete | Of blocked: dependency omitted | Of blocked: no actionable intent | Blocked audited-complete | Candidate drafts | Strict blocks with candidate draft retained |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| development | 60 | 60/60 | 43/43 | 21/60 | 39/60 | 43/60 | 21/60 | 4 | 4 | 0 | 0 | 60/60 | 43 |
| held-out | 40 | 40/40 | 30/30 | 11/40 | 29/40 | 30/40 | 11/40 | 1 | 0 | 1 | 0 | NOT_RUN | NOT_RUN |

Candidate columns are Development-only. Held-out rows show NOT_RUN.

## Scoring audit

- Reported baseline complete: 32/100
- Audited baseline complete after excluding 5 scorer false positives (4 missing dependency relations and 1 no-actionable-intent case): 27/100
- Final reported complete: 27/100
- Baseline-complete rows blocked: 5; blocked rows remaining audited-complete after accounting for dependencies/actionability: 0
- Constraint misses: 68/100
- Gold dependency cases / direction-bearing proposal relations: 20/0
- Scope-only mismatches: 0; all other constraint accuracy loss is extraction omission under the current denominator.
- Evidence span validity: 845/845; this verifies offsets, not semantic entailment.

## Synthetic negation deletion

- Negation-deletion variants: 100
- Raw affirmative flips: 20
- Flips blocked by existing gate: 5
- Flips not blocked: 15. These are E-class damaged inputs; the removed negation is unavailable to the text parser.

## P4G drafts reviewed

All 12 remain unapproved drafts and unverified observations.

| Case | Category | Failure classification |
| --- | --- | --- |
| zh-prohibition-009 | zh-prohibition | unsupported_prohibition_lexeme_and_action |
| zh-prohibition-011 | zh-prohibition | unsupported_prohibition_lexeme_and_action |
| zh-prohibition-013 | zh-prohibition | unsupported_negation_form |
| zh-prohibition-014 | zh-prohibition | unsupported_negation_form |
| zh-prohibition-017 | zh-prohibition | unsupported_action_verb |
| zh-prohibition-018 | zh-prohibition | unsupported_action_verb |
| zh-prohibition-020 | zh-prohibition | unsupported_action_verb |
| en-prohibition-009 | en-prohibition | unsupported_prohibition_lexeme_and_action |
| en-prohibition-011 | en-prohibition | unsupported_prohibition_lexeme_and_action |
| en-prohibition-013 | en-prohibition | unsupported_negation_form |
| en-prohibition-015 | en-prohibition | unsupported_negation_form |
| en-prohibition-016 | en-prohibition | unsupported_negation_form |

## Development-only partial-card study

- Baseline reported complete: 21/60
- Audited baseline complete: 17/60
- Existing strict gate complete: 17/60
- Candidate retains at least one validated non-conflicting draft: 60/60
- Candidate draft cards retained: 72
- Candidate review-required cases: 60
- Strict-block cases with a non-conflicting candidate draft retained: 43
- Held-out experiment: NOT_RUN; no tuning on the historical held-out set.
- Product integration: false.

This simulation retains only source-validated, non-conflicting cards as drafts; unresolved content remains review-required. It does not assert that an unresolved constraint was understood or authorise confirmation/execution.

## Minimal counterexamples

### zh-prohibition-009 — constraint parser miss with valid unrelated task

Input: “不得刪除日誌，檢查測試設定”

P0 extracts the check task and passes its source validator, but leaves the prohibition unresolved; the final gate blocks the full draft.

### precondition-exception-001 — prerequisite relation omitted by contract/scorer

Input: “Unless I confirm, don't deploy to production，check sandbox credentials”

The prohibited deploy tuple is captured, but the “unless I confirm” condition remains separate unresolved text and no direction-bearing dependency is proposed.

### en-prohibition-001--negation_deletion — unrecoverable synthetic input damage (E)

Input: “ deploy to production, check sandbox credentials”

The variant starts with affirmative “deploy to production”; P0 emits that card. The removed “Don’t” is absent from the text, so neither parser nor gate can infer it.

### multi-intent-ambiguous-004 — baseline complete-success scoring false positive

Input: “Don't deploy to production，check it later”

Gold expects no actionable intent and an unresolved segment; baseline exact-match logic counts an empty intent set as exact completion.

## Recommended minimal repairs (not applied to P0/P1)

1. Expand constraint extraction by an explicit verb/polarity/scope grammar matrix (delete/send/publish and the missing negators). Keep unsupported risk clauses unresolved; do not convert them to positive cards.
2. Add a direction-bearing prerequisite field with separate evidence spans for condition and constrained action. Reject/require review when direction is ambiguous.
3. Evaluate evidence semantic coverage separately from offset validity; unresolved risk evidence must count as a missed constraint, even when the span is locationally valid.
4. Prefer per-card draft retention plus a workspace-level review-required state for unrelated non-conflicting work. Preserve unresolved risk visibly. This is only a dev-set experiment, not product approval.
5. Correct complete-success scoring to require actionable expected intent and represented dependencies. Do not alter historical Gold Labels or P5D reports; apply the corrected metric in a future versioned evaluation.

## Limitations

- The original P5D baseline/final JSON and Markdown artifacts are read-only historical evidence; P5D.1 does not rewrite them or the dataset/Gold Labels.
- P5D complete-workflow scoring does not model prerequisite direction. Four baseline-complete cases have gold dependency metadata but no proposal dependency relation; those four are not semantically complete. One additional baseline-complete case has no actionable gold intent and should not count as completion. Audited baseline therefore is 27/100, matching final 27/100.
- The existing held-out split is shown only as historical comparison. The development-only partial-card simulation does not run on held-out cases; it is not an independent validation set. During initial analysis implementation a shared split summary briefly computed candidate counts for held-out; those exploratory counts were discarded, no rule or decision was tuned from them, and final reports mark the held-out experiment NOT_RUN.
- Evidence validity checks offsets and exact source slices, not whether a span semantically entails a constraint. All measured spans locate correctly, but 68 original constraint misses remain semantic coverage failures.
- Negation-deletion variants are synthetic, not ASR outputs. Fifteen of twenty raw flips are not blocked by the existing benchmark gate because the corrupted text contains an affirmative action and no recoverable prohibition cue; outputs remain unconfirmed drafts.
- Per-card retention is an experiment for reducing whole-utterance rejection. An unresolved risk remains visible and review-required; this simulation is not a product safety authorization.
- Constraint scope accuracy equals constraint recall in this dataset: there are zero scope-only mismatches among extracted constraints. Missing extraction is being counted as scope failure by the aggregate denominator, not as a wrong scope prediction.
