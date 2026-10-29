# P5D Safety Robustness Evaluation

## Scope and data

P5D is a text-only robustness benchmark. It contains 100 original instructions authored for this project: 20 each in Traditional Chinese prohibitions, English prohibitions, mixed-language prohibitions, preconditions/exceptions, and multi-intent/ambiguous instructions. Each original has three deterministic variants: `negation_deletion`, `homophone_token_substitution`, and `punctuation_boundary_change`. Every variant is marked `SYNTHETIC_ERROR_INJECTION`.

This dataset is not Common Voice, not a speech corpus, and not an output from Whisper or any other recognizer. Synthetic corruption is not an estimate of real ASR error frequency. No source audio is present.

Dataset version: `p5d-safety-v1`. The split and variant seeds and canonical dataset SHA-256 are included in JSON reports. A source instruction and all three variants always remain in the same split. Each of the five categories has 12 development originals (36 variants) and 8 held-out originals (24 variants): 60/40 originals and 240/160 total rows.

## Evaluation process

1. Run `pnpm benchmark:p5d:baseline` before evaluating any safety changes. It evaluates the existing P0 deterministic parser and validator.
2. Analyze Development results only. The P0 parser and validator remain unchanged; the final mode adds a benchmark-only conservative gate.
3. Run `pnpm benchmark:p5d:final`. The gate blocks all draft cards when the P0 validator fails, an explicit prohibition is unrepresented/unresolved, or a precondition/exception cue is present.
4. Inspect the held-out results only after the gate has been fixed. Do not change rules based on held-out results.

`reports/p5d-baseline.*` preserves the pre-gate baseline. `reports/p5d-final.*` records the benchmark-only gate and compares it with that baseline. Per-case `proposal` fields capture parser output; `acceptedIntents` represent cards allowed through the research gate. A blocked proposal is never emitted as a confirmed or executable card. This gate does not alter the P1 product UI.

## Metric definitions

All reported rates carry numerator and denominator. Final `intentExactMatch` uses accepted pipeline cards; `proposalIntentExactMatch` gives raw parser exact match. Constraint recall and scope accuracy use gold constraint tuples and raw proposals. `unsupportedActionRate` counts unsupported/conflicting raw parser cards over raw parser cards; `acceptedUnsupportedActionRate` separately measures accepted cards. Evidence validity measures parser-proposed spans that exactly slice the input using JavaScript string offsets. Safe rejection is measured over all 300 synthetic variants whose expected disposition is `safe_reject`; final gating can safely block without understanding, but that does not count as complete success. False rejection uses the 100 original cases labeled `draft`. Human confirmation is required over accepted draft cards. Complete workflow success uses the 100 original cases and requires exact intents, all constraints and scopes, valid evidence, no unsupported action, confirmation-required cards, and expected unresolved handling. Negation flip rate measures conflicting affirmative cards in raw parser output over the 100 prohibition-bearing negation-deletion variants. `negationFlipPrevented` separately counts raw flips that the final gate suppresses.

Outcome flags overlap. In particular, `negationDeletionUnrecoverable` marks input damage where the negation token has been removed; without audio or an alternate transcript, the original intent cannot be reconstructed from the corrupted text. Such cases are not automatically attributed to parser failure. Missing constraints on unaltered originals, misplaced scope, conflicts, and unsupported cards remain parser/gate observations.

## Development findings and safety gate

The baseline report is generated before the final gate. Unsupported prohibition forms and precondition language are frequently unresolved by P0's finite grammar. The validator checks provenance and its known grammar but is not a general semantic contradiction detector. This benchmark layer therefore fails closed for detected risk clauses and condition cues, including when an unrelated task occurs in the same utterance. It intentionally sacrifices some usable draft output. A safe rejection is reported separately from successful task understanding.

The final gate is deliberately narrow and conservative. It is not proof that arbitrary natural-language risk is understood. It cannot recover a negation already deleted from the input, and it is not wired into a new LLM or enabled in the P1 UI.

## P4G traceability

The final report creates at most 12 deterministic P4G-style review drafts from Development original failures, linked to synthetic benchmark case IDs and dataset hash. They are explicitly `draft`, require human review, and set `verifiedDefect: false`. They are report artifacts only: they are not inserted into the user's persisted P4G workspace, approved, turned into GitHub issues, or treated as reproduced product defects.

## Reproduction

```bash
pnpm benchmark:p5d:baseline
pnpm test -- tests/evaluation/p5d.test.ts
pnpm benchmark:p5d:final
```

Baseline and final JSON/Markdown artifacts are version-controlled. They contain only project-authored synthetic text and aggregate/per-case parser results. No ASR live result is claimed.
