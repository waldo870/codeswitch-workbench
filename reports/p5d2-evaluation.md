# P5D.2 Scoring Contract and Constraint Research

- Status: RESEARCH_ONLY; not connected to P1
- Constraint contract: constraint-contract-v2
- Scoring: scoring-contract-v2
- Historical P5D dataset: p5d-safety-v1 — sha256:696f86d9865e5aecace2bab0d01c09d0b5b2d7e49195e7c1b4c110c0e7a1a86a
- Development calibration: p5d-development-calibration-v1+p5d-development-exposed-v3 — sha256:2ec39e55c64d7cab3020450b31fa59b9cf05320398ce64f6db5b7dae8b93a995 (66 cases; used for tuning: yes)
- Independent validation: p5d-independent-validation-v4 — sha256:05d6846994a6756f6eb47309c5744cd9fda3fd06431f2875b2d67aa8cef5d5b4 (24 cases; used for tuning: no)
- P5D v1 held-out candidate evaluation: NOT_RUN
- Live ASR: NOT_RUN

## Scoring v1/v2 historical comparison

| Scoring | Baseline complete | Final complete |
| --- | ---: | ---: |
| v1 reported | 32/100 | 27/100 |
| v2 rescored from recorded rows | 27/100 | 27/100 |

V2 rescoring only adds actionable-intent and prerequisite-direction gates to recorded v1 complete rows; original v1 reports remain immutable. The historical held-out split is not used for candidate evaluation or tuning.

## Development vs independent validation

Only Development inputs informed rule/prototype research. The 66-case development calibration (two exposed sets) was viewed during implementation and is reported separately from the 24-case independent validation. Metrics below are numerator/denominator; complete success requires an actionable task, exact required slots, every constraint and scope, every prerequisite direction, no unsupported action, semantically aligned and locatable evidence, no unresolved risk, and draft-only human-confirmation status. A safe rejection or retained draft never counts as complete success.

| Metric | Development (240 rows) | Calibration (66) | Independent validation (24) |
| --- | ---: | ---: | ---: |
| Intent exact | 169/240 (70.42%) | 65/66 (98.48%) | 24/24 (100.00%) |
| Required slots complete | 183/240 (76.25%) | 66/66 (100.00%) | 24/24 (100.00%) |
| Constraint recall | 159/240 (66.25%) | 43/52 (82.69%) | 13/19 (68.42%) |
| Constraint scope accuracy | 124/240 (51.67%) | 41/52 (78.85%) | 12/19 (63.16%) |
| Prerequisite direction | 22/48 (45.83%) | 11/11 (100.00%) | 4/4 (100.00%) |
| Complete success | 17/60 (28.33%) | 8/66 (12.12%) | 1/24 (4.17%) |
| False rejection | 0/194 (0.00%) | 0/62 (0.00%) | 0/23 (0.00%) |
| Negation flip | 14/60 (23.33%) | 0/0 (n/a) | 0/0 (n/a) |
| Unsupported actions | 14/245 (5.71%) | 1/72 (1.39%) | 0/26 (0.00%) |
| Unsupported constraints | 35/159 (22.01%) | 6/47 (12.77%) | 2/14 (14.29%) |
| Evidence location validity | 443/443 (100.00%) | 131/131 (100.00%) | 45/45 (100.00%) |
| Evidence semantic alignment | 443/443 (100.00%) | 130/131 (99.24%) | 44/45 (97.78%) |
| Draft retention | 245/245 (100.00%) | 73/73 (100.00%) | 27/27 (100.00%) |
| Human review requirement | 194/194 (100.00%) | 63/63 (100.00%) | 23/23 (100.00%) |

## Per-card review prototype

Development: 240 workspace rows flagged REVIEW_REQUIRED; 245/245 (100.00%) of P0 draft cards retained; 0/194 (0.00%) false rejection among eligible inputs with P0-recognized expected cards. Calibration: 64 rows flagged; 73/73 (100.00%) drafts retained. Independent validation: 23 rows flagged; 27/27 (100.00%) drafts retained; 0/23 (0.00%) false rejection. Every retained card remains draft with requiresConfirmation=true. Conflicting cards are removed from the draft proposal; unresolved constraints and provenance remain visible in the workspace record. Nothing is executed or confirmed.

## Validation results

The 24-case validation set is versioned and hash-pinned. It was authored after implementation changes were frozen and evaluated once; do not tune on it. The 66-case calibration data is development data, not held out.

## Limitations

- P5D v2 rule research and per-card review analysis run on the original 240-row Development split and two exposed calibration sets (36 + 30 cases) whose outputs were observed during implementation. Historical 160-row held-out candidate evaluation is NOT_RUN.
- The 24-case independent validation set was authored after implementation/scoring changes were frozen and evaluated once. Do not use its outcomes for tuning.
- P5D validation examples and corruption variants are project-authored text only. This is not ASR output and makes no Whisper or live-audio claim.
- The constraint parser is a small research grammar. Unknown or ambiguous restriction text is retained as unresolved; it is not a general semantic safety guarantee.
- Evidence semantic alignment is a rule-based check for explicit negator/action/scope and prerequisite cues, not a human entailment judgment.
- Per-card retention keeps drafts review-required and non-executable. It is not connected to P1 and does not count as complete success.
