# P2A evaluation methodology — v1

This is a text-only, original synthetic benchmark for CodeSwitch Workbench, not Common Voice or a speech benchmark. It is preliminary, small, authored during development and not independently annotated. It cannot establish production safety or hardware performance.

## Frozen inputs and no tuning

`tests/fixtures/benchmark-v1.json` contains 60 manually specified gold examples: 10 Traditional Chinese, 10 English, 15 code-switching, 10 multi-intent, 10 constraints/prerequisites and 5 ambiguous/incomplete examples. The primary groups are mutually exclusive; `languageCategory` and `difficultyTags` record overlaps. Each record includes expected intent types, card count, important slots, constraints and unresolved/safety-block behavior. Names are invented and no credentials are included.

Version: `benchmark-v1.0.0`. SHA-256 over exact UTF-8 bytes (including the final newline): `d0ada927031c7d88bfc0088b95e54d0d597e85e7dd1924732be14b8768767c94`. The manifest and tests pin this hash. Dataset and scoring code were created and tested before the recorded baseline run. Gold labels are not derived from model outputs. The provider receives only source text and a fixed schema/system prompt, never IDs, labels, tags or expected answers.

No model prompt tuning was performed. All 60 records form this evaluation set; there is no claim of blind held-out annotation or statistical independence from engineering. Before any future prompt tuning, create a separate development set and reserve a new untouched evaluation set/version. Never change these labels to improve a particular model score. Published corrections require an explicit new dataset version and rationale.

## Three methods

- **A — Deterministic + P0 validation:** existing extractor and source validator. Record raw output before validation; on a P0 failure remove actionable cards and record unresolved review. Missing fields/unsupported input block acceptance for safety scoring. P0 is a finite rule validator and cannot detect all omitted natural-language constraints.
- **B — Local LLM + schema:** fixed Ollama structured-output proposal. JSON/Ajv validation is applied; semantic/evidence/constraint verification is not used to improve this method's predictions. Nullable required slots and explicitly unresolved content are treated as needing review. B never admits production work cards; it is an experimental raw prediction row.
- **C — Same LLM proposal + independent verification:** reuse the exact B extraction, without a second model call. Verify quotations, supported slots/actions/titles, recognized source constraints, prerequisites and coverage. Conservatively reject the whole proposal's cards on a validation error; retain only grounded supported constraints, and add an unresolved review record. All admitted cards are drafts and require confirmation. No confirmed export is implemented or connected to the P1 UI.

Every case retains raw text, raw schema status, raw proposal, raw score, verification errors, final proposal, admitted draft cards, identity and duration. Rejection never erases the model's raw omissions/unsupported actions. Report raw and final scores separately. Refusing every request can raise safe-rejection rate but fails card/slot/task-completion metrics; it is not a successful assistant.

## Metrics and denominators

| Metric | Definition |
| --- | --- |
| Complete success | Intent set and count exact, every gold slot correct, every expected constraint retained, no extra constraints/actions, all emitted evidence valid, correct unresolved behavior, and blocking when gold requires it. All conditions must hold. |
| Intent exact match | Set of predicted card types exactly equals gold type set, per all examples. Multiplicity is measured separately by count. It does not prove slot correctness. |
| Card count accuracy | Predicted count equals gold count, per all examples. A transport/schema failure is incorrect even when gold expects zero cards. |
| Slot accuracy | Correct expected slot values / all gold slots. Missing cards/fields are wrong. Extra cards do not enlarge this denominator; they are penalized by count and unsupported-action metrics. |
| Constraint recall | Matched unique (polarity, action, scope, dependsOn) gold tuples / all gold constraint tuples. Wrong scope/polarity/prerequisite does not match. Extra constraints are counted separately and invalidate complete success. |
| Unsupported action rate | Predicted cards without a one-to-one gold type/action/target anchor (recipient name for email) / all predicted cards. Extra duplicate cards count as unsupported. Wrong time is a slot error rather than an extra action. |
| Evidence validity | Valid exact source evidence / all emitted card, constraint and unresolved evidence items. P0 trusted UTF-16 spans are slice-checked; model quotes must locate uniquely. Zero evidence yields N/A, never 100%. Schema failures yield no evidence observations and remain failed examples. This metric does not prove that fields follow from the quotation. |
| Safe rejection | Gold safety-eligible examples appropriately blocked / all gold safety-eligible examples. Provider errors do not receive credit. A valid refusal may receive safety credit while failing complete success. Eligibility is fixed in gold for incomplete/uncertain/conflicting/constraint-only requests. |
| Latency | End-to-end extraction per example, nearest-rank P50/P95, milliseconds. A includes parser + validator. B includes model request and first-use discovery/load. C adds independent verification time to that same B request. These are not throughput or accelerator benchmarks. |
| Failures | Separate invalid JSON, schema mismatch, timeout and total provider-failure counts. No failed request is silently retried or dropped from semantic denominators. |

Slots are compared after Unicode NFKC, case folding and whitespace normalization; null stays null. Only a fixed small relative-date alias table equates `明天早上九點`, `明天九點`, `tomorrow at 9 am` and `Tomorrow, 9:00 AM`, and `明天`/`tomorrow` with `Tomorrow (time unknown)`. No absolute dates, missing email addresses or arbitrary semantic synonyms are inferred. Titles are not scored as gold slots, but the verifier checks their operation consistency.

Card alignment is deterministic, one-to-one greedy matching: prioritize exact type/action/target (or recipient) anchors, then the number of equal slots, then source-array indices for ties. Unmatched expected cards lose every expected slot; unmatched/incorrect-anchor predictions count as unsupported actions. This is documented finite matching, not an LLM judge or a claim of optimal semantic alignment.

Unresolved correctness compares the presence of unresolved segments with the fixed gold boolean. Missing null slots can require blocking without an extra unresolved segment. C's generic review record is a real refusal, not a model-derived discovery. Its potentially high evidence validity must be read with admitted-card count and complete-success rate.

## Reproducibility and reporting

Use the checked-in lockfile, dataset manifest, code revision and fixed prompt version/hash. Parameters: temperature 0, seed 42, num_ctx 8192, num_predict 4096; non-streaming JSON Schema output; per-request timeout 60 seconds; input limit 10,000 UTF-16 code units; response limit 262,144 bytes. There is one sequential pass per model with no warm-up. Discovery/model-load cost can affect the first sample. Temperature zero is not a guarantee of bitwise reproducibility across runtime/hardware versions.

At most two already installed non-cloud models are selected: prefer Qwen; choose the smallest and largest installed eligible candidates by file size, or use explicit `--model=tag` flags. File size is a selection heuristic, not proof of quality. Inspect metadata/licensing before interpreting results. No model pull or cloud API exists in this implementation.

`benchmark:report` aggregates stored runs without inference, checks dataset identity and case coverage, and recomputes summaries from recorded case scores. It preserves source-run timestamps/environment. It does not authenticate arbitrary edited report files. NOT_RUN has null summaries and empty cases; it is never a synthetic zero or passing score.

## Independent verifier limits

The new scanner recognizes the explicitly documented English/Chinese negations, required checks, `only prepare a draft`, `先檢查再執行`, check-before-deploy and user-confirmation-before-publish forms. It is not the gold-label file and never queries the model. Evidence is uniquely located with JavaScript string indices; duplicate quotes remain ambiguous. Original input is application-owned. Model-supplied status/confirmation claims are retained in raw logs only, then replaced with draft/true for admitted cards.

Field grounding requires literal source support or documented aliases. Unknown actions, unsupported constraints, incomplete required fields, negated/conditional card evidence, multiple clauses in one card quote, unverified source coverage and unmet prerequisites fail closed. This may reject useful paraphrases. Simple lexical evidence and finite constraints cannot prove arbitrary natural-language entailment, coreference or contradictions; broad quotation can still hide missed intent. Gold scoring exposes errors beyond this validator. Do not connect proposals to external execution or confirmed exports.
