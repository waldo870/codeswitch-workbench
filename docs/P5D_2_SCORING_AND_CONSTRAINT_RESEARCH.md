# P5D.2 Scoring Contract and Constraint Research

Status: research-only. Nothing in this phase is connected to the P1 UI, speech providers, model runtimes, or execution paths.

## Frozen inputs and boundaries

- Historical synthetic dataset: `p5d-safety-v1`, 100 authored instructions plus 300 `SYNTHETIC_ERROR_INJECTION` variants; SHA-256 `sha256:696f86d9865e5aecace2bab0d01c09d0b5b2d7e49195e7c1b4c110c0e7a1a86a`.
- Development: 60 original instructions and their 180 variants (240 rows). Only these rows were used to investigate the research grammar/prototype.
- Historical held-out: 40 instructions and their 120 variants (160 rows). Candidate evaluation is `NOT_RUN`; they were not used for this experiment.
- Development calibration: 66 authored instructions exposed during implementation (the original 36-case calibration set plus 30 cases whose output was observed before the scoring contract's unsupported-constraint check was finalized). Combined SHA-256: `sha256:2ec39e55c64d7cab3020450b31fa59b9cf05320398ce64f6db5b7dae8b93a995`. These are development data, not held out.
- Independent validation v4: 24 newly authored instructions, four per category, SHA-256 `sha256:05d6846994a6756f6eb47309c5744cd9fda3fd06431f2875b2d67aa8cef5d5b4`. This set was authored after implementation/scoring changes were frozen and evaluated once; it must not be used to tune the current rules.
- All sets are original text, not Common Voice, ASR output, or a real-user corpus.

## Scoring contract v2

A complete workflow requires all of the following: at least one actionable expected intent; exact supported intent/action/target set; complete required slots; every Gold constraint with correct polarity and scope; every applicable prerequisite with the correct direction and predicate; no unsupported proposal; no unresolved parser or constraint segment; no blocked card; valid UTF-16 source spans; evidence that lexically supports the cited card/constraint; and draft cards that still require human confirmation. Safe rejection and draft retention are reported separately and never count as complete success. Unresolved-only input cannot be a complete success.

The P5D v1 scorer and reports remain unchanged. Historical v2 rescoring removes four baseline rows whose Gold prerequisite direction was not represented and one row with no actionable Gold intent: baseline 32/100 becomes 27/100; final remains 27/100. This audit is a correction to the historical score, not a new parser run.

All report metrics include numerator and denominator. Constraint recall counts matching action/polarity pairs over Gold constraint instances; scope accuracy counts exact action/polarity/scope matches over those same Gold instances; prerequisite accuracy counts Gold prerequisite instances; complete success uses original cases only; unsupported action rate counts raw parser proposals; evidence metrics count cited evidence items; false rejection counts eligible expected-draft cases that had an expected parser card but no retained draft; draft retention counts retained P0 cards over all P0 cards; human review counts rows with review required over rows with P0 cards. A zero denominator is `null`, not zero percent.

## Constraint Contract v2

`src/evaluation/p5d2-contract.ts` defines independent records for prohibition/requirement, action, scope, evidence and optional prerequisite. Prerequisite direction is explicit (`prohibited_unless` or `prohibited_until`) and includes a predicate and its own evidence. Unknown condition direction remains unresolved. It does not modify the P1 contract.

`src/evaluation/p5d2-constraints.ts` implements a deliberately limited bilingual research grammar for selected negators, verbs, scopes, and confirmation/approval/backup/security-review cues. Evidence indexes follow JavaScript UTF-16 indexing. This is not a natural-language entailment model or general safety verifier; matching is finite and can miss paraphrases, clause attachment, nested conditions, and broader action synonyms.

## Per-card review prototype

The benchmark-only prototype filters a direct card/constraint action-scope conflict while retaining unrelated P0 draft cards. It preserves constraint and unresolved provenance at workspace level. Retained cards are always `draft` and `requiresConfirmation: true`; it has no confirmation or execution operation. It is not integrated with P1. Draft retention is not complete workflow success, and the exact conflict matcher is not a product-grade safety boundary.

## Results

Machine-readable and human-readable row-level results are in `reports/p5d2-evaluation.json` and `reports/p5d2-evaluation.md`. On the original Development split, complete success is 17/60 original cases; constraint recall is 159/240, scope accuracy 124/240; prerequisite direction 22/48; false rejection 0/194; synthetic negation flip 14/60; unsupported raw actions 14/245; unsupported constraints 35/159; evidence location and rule-based semantic alignment 443/443; P0 draft retention 245/245. The exposed calibration supplement is separately scored in the JSON report.

On independent validation v4, complete success is 1/24; constraint recall 13/19, scope accuracy 12/19; prerequisite direction 4/4; false rejection 0/23; unsupported raw actions 0/26; unsupported constraints 2/14; evidence location 45/45 and lexical semantic alignment 44/45; P0 draft retention 27/27. The weak complete-success result is evidence that this finite research grammar does not generalize reliably. It does not qualify for product integration.

The Development data contains a high concentration of explicit, generated constraint forms. Synthetic negation deletion removes information; a parser cannot recover original intent from the corrupted text alone. Independent validation is small, authored, and one-time evaluated. Evidence semantic checks are lexical heuristics rather than human entailment judgments. No live ASR or model was run. Product gate remains closed; no P1 changes were made.
