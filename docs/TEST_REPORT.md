# P0 test report

## P5D release and P6 branch acceptance

P5D was fast-forwarded to main and pushed without history rewriting; remote main is `9ea9c23d7a9ca2fbda0ab81b87e7f2ac75394dee`. The GitHub Actions run completed successfully. P5D Product Gate remains `NOT_QUALIFIED`.

P6 local gates: `pnpm install --frozen-lockfile` PASS; `pnpm typecheck` PASS; Vitest **365/365 PASS** across 28 files; `pnpm build` PASS; `pnpm demo` PASS (3 draft cards, 1 prohibited constraint); `PLAYWRIGHT_PORT=4174 pnpm test:browser` **36 PASS, 4 pre-existing Live ASR tests SKIPPED** (40 total); `git diff --check` PASS. Port 4174 was used because an unidentified existing listener occupied the default 4173 during the first attempt; no existing process was terminated.

## P6D/P6E/P6F local integration (2026-10-30)

P6D and P6E were developed in independent worktrees from shared local contract commit `697d3542fe43f743bba11d9e9c79d3249db0e795`, then merged without file replacement into local integration branch `feature/p6-integration-efficiency`. P6D commit: `e608dfac37d8625eb2616017598bb01d1309f8aa`. P6E commits: `1df67d84a5f31098da6ff50551e9a98a5695a513` and `63fd98ddc889ff37c0f54aa1422946d3f9e10a07`. P6F evaluation tooling is local and does not affect P1 product behavior.

The P6D UI uses a deterministic mock only. An optional Node-only LM Studio provider and fixed smoke are implemented with mocked transport tests; Live translation was `NOT_RUN` because `CODESWITCH_LMSTUDIO_MODEL` was not configured. P6E creates separate routine drafts and offers a parser/validator-gated conversion to a new P1 Workspace JSON for use with existing P6A collaboration. Conversion blocks partial recognition, creates only draft P1 cards with parser-derived evidence, and explicitly omits routine-only metadata. The P6A encrypted payload schema was not changed.

Final local gates: frozen install PASS; typecheck PASS; Vitest **393/393 PASS** across 33 files; build PASS; CLI demo PASS (3 draft cards and 1 prohibited deploy/production constraint); `PLAYWRIGHT_PORT=4180 pnpm test:browser` PASS with **40 passed and 4 pre-existing opt-in Live ASR tests skipped** across desktop/mobile Chromium. The new P6D/P6E browser flows were also exercised in a targeted run; the final browser gate includes the P6D mock immutability and P6E draft Workspace conversion checks. `pnpm benchmark:p6f` reports `HUMAN_EVALUATION_NOT_RUN`, zero observations, and null timing; this is not a workflow efficiency result.

P6A/P6B main release remains at `fe46d654fbdd211266c8dc14de892186bd6633dc`; no subsequent P6D/E/F change was pushed. P6 physical cross-device validation, live LM Studio translation, routine metadata transport through the encrypted envelope, and human workflow evaluation remain unverified/not implemented.

The new Browser tests cover request/reply file flow in two isolated contexts on this machine, draft-only work cards after import, replay rejection and locally persisted review status for the 28 unverified backlog records. Crypto unit tests cover authenticated round trip, unique nonces, wrong password, tampering, version mismatch, expiry, size limits and three-way merge/conflict detection. These are software tests, not physical cross-device, real network-loss cold-start, or penetration-test evidence. P5D Product Gate remains `NOT_QUALIFIED`.

## P4G release and P5 speech evaluation checkpoint (2026-10-29)

P4G was verified and released before P5 work began. The `feature/p4g-feedback-improvement` commit `6747ed0d00215ef71ff1473b4cff54fe7c484357` was a fast-forward descendant of the then-current `origin/main`. The release gates passed, the public GitHub `main` was verified at that SHA, and GitHub Actions run `40724014820` completed successfully. The feature branch was preserved. No visibility change was made.

P5 branch: `feature/p5-open-speech-evaluation`, based on verified main `6747ed0d00215ef71ff1473b4cff54fe7c484357`.

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS: 340 tests across 24 files |
| `pnpm build` | PASS |
| `pnpm demo` | PASS: 3 work cards, 1 constraint; validation passed |
| `pnpm test:browser` | PASS: 32 passed; 4 existing live ASR tests skipped (not counted as passed) |
| `pnpm benchmark:speech` | Correctly reports `NOT_RUN`, 0 samples; report metrics remain null |
| `git diff --check` | PASS |

No Common Voice or FLEURS audio was downloaded. Common Voice download requires Owner-provided account access and acceptance of the current dataset terms. There is no local sample manifest, and the existing Windows Whisper runtime/model is not configured in this execution environment. Therefore there are no live transcription results, CER/WER values, ASR latencies, or P4G proposals derived from measured errors. The benchmark implementation and reports distinguish missing data from zero error and do not claim a live ASR pass.

## P5 real Common Voice sample preparation (2026-10-29)

The Owner-provided Common Voice archives were found under the supplied `voice/` data directory. Source metadata was read from the zh-TW dataset README and `test.tsv`, and the English Spontaneous Speech README and `ss-corpus-en.tsv`. Fixed-seed SHA-256 ordering selected 10 records from each official test split. The zh-TW release is `cv-corpus-27.0-2026-09-11`; the English release is `sps-corpus-5.0-2026-09-11-en`. Both dataset READMEs state CC0. The local manifest contains the exact source IDs, unchanged references, license/attribution, original audio hash and prepared WAV hash. Original and prepared selected audio remains under ignored `local-only/p5-speech/`; no full dataset, audio, transcript, or demographic fields are in the Git diff.

The already-present Windows Python 3.10 executable and Whisper `large-v3.pt` checkpoint were found, but the worker configuration environment variables were absent. A direct attempt to start Windows Python reported `WSL (9 - ) ERROR: UtilBindVsockAnyPort:309: socket failed 1`, before Whisper import. Therefore the two-language smoke and live inference were not run. `pnpm benchmark:speech` validated all 20 source/prepared file pairs, hashes, WAV formats, and limits, then emitted `NOT_RUN`: 20 not-run cases, 0 attempts, null CER/WER/latency, and 0 P4G drafts. It did not run transcription. The benchmark report records manifest SHA-256 `sha256:6939e4d0977371bfadd109bee5a04275e03c0d8ecbc6fb37e86ce26eb2294b11` and the distinct dataset release per language.

## P5 live result review (2026-10-29)

The Owner ran the existing `pnpm benchmark:speech` in a general WSL terminal. The resulting JSON/Markdown files were reviewed without rerunning ASR. Windows Whisper large-v3 CPU reports 20/20 completed, 0 failed, 0 timeouts; zh-TW scripted CER 12/77 (15.58%), English spontaneous WER 75/430 (17.44%). The per-language sample counts, latency distributions, audio durations, RTFs and five highest normalized error-rate cases are documented in `docs/P5_ASR_EVALUATION.md` and `reports/p5-asr-results.md`. The report has 16 unverified P4G draft candidates; none were approved. No source transcript or audio is included in Git. This is not a mixed-language speech test.

## P5D safety robustness benchmark

P5D uses 100 project-authored text instructions and 300 deterministic `SYNTHETIC_ERROR_INJECTION` variants. No audio or Whisper result is involved. The 60/40 split is source-grouped and stratified 12/8 per category. `reports/p5d-baseline.*` records the P0 parser before the benchmark-only gate; `reports/p5d-final.*` records the separate conservative gate and per-case comparison. Only Development failures informed the gate and P4G-style draft proposals. Held-out metrics were read after the gate was fixed. P0/P1 product behavior is unchanged. See `docs/P5D_SAFETY_EVALUATION.md` for metric denominators, results, limitations and reproduction.

## P5D.1 failure attribution (2026-10-30)

The P5D dataset SHA and original result files were verified unchanged. The review found that the reported 32/100 baseline complete success includes four precondition cases whose dependency direction was not represented and one case with no actionable expected intent. After auditing those scorer false positives, baseline complete success is 27/100, matching the final report's 27/100. Of 73 strict gate blocks on originals, 68 had a missing constraint; the remaining five were the scorer false positives. The Development-only partial-card retention simulation kept unrelated source-validated tasks as review-required drafts in 60/60 cases; it was not run on held-out or integrated into P1. See `docs/P5D_1_FAILURE_ANALYSIS.md` and `reports/p5d1-failure-analysis.md`. Added five Vitest cases for attribution and Development/held-out isolation.

Checks after the report/code metadata update: `pnpm typecheck`, `pnpm test` (341 tests), `pnpm build`, `pnpm demo`, `pnpm test:browser` (32 passed, 4 existing Live ASR tests skipped), and `git diff --check` passed. The Live ASR results were not regenerated during this review.

Task: P0_TEXT_WORKCARDS_FOUNDATION. Local verification completed in the supplied development environment (session date: 2026-10-22).

## Environment and provenance

- Workspace: /home/waldo870/projects; target did not exist before creation.
- Parent directory was not inside a Git repository; no ancestor AGENTS.md was found at checked ancestor paths.
- Git 2.34.1; Node v22.23.2; pnpm 11.25.0; gh 2.98.0.
- Installed: TypeScript 7.0.2, Vitest 5.0.5, tsx 4.23.15, @types/node 26.6.5. Exact dependency graph is in pnpm-lock.yaml.
- Independent repository initialized on main, followed by feature/p0-text-workcards. No remote created or push performed. No other project was read or imported.

## Actual checks

| Command / check | Observed result |
| --- | --- |
| pnpm install --frozen-lockfile | Exit 0 after dependency script configuration |
| pnpm typecheck | Exit 0; no diagnostics |
| pnpm test | Exit 0; 2 test files, 43 tests passed |
| pnpm demo | Exit 0; 3 work cards, 1 constraint, Validation: PASS |
| CLI negative-path check using contradictory input | pnpm demo exited 1; direct-conflict error reported |
| git diff --check | Exit 0; no whitespace errors |
| git status --short before staging | Only new P0 project files; no unrelated modifications |

The negative CLI check temporarily replaced the example with `Deploy to production, but do not deploy to production.` and restored the original bytes in a finally block. It reported `valid: false`, `executable: false` and `Card directly conflicts with prohibited action`.

## Acceptance output

- Calendar: Review payment webhook; Tomorrow, 9:00 AM; evidence [0,29).
- Task: Check sandbox credentials; evidence [32,57).
- Email draft: Prepare English follow-up email to Vincent; recipientEmail null; language English; body null; evidence [98,141).
- All three cards: draft, requiresConfirmation true.
- Constraint: deploy / production / prohibited; evidence `don't deploy to production yet`, [63,93).
- Unresolved: zero. Validation valid true, requiresReview true, executable false. No deployment card.

## Coverage and limitations

Twenty fixture scenarios cover Chinese, English, mixed language, multiple intents, the acceptance sentence, prohibited and affirmative operations, partial dates, recipient names, UTF-16 evidence, unknown input, reminders, drafting versus sending, environment scopes, required constraints, ambiguous clauses and blank input. Additional tests assert exact demo fields, missing values, unsupported qualifiers, malformed schemas, field/evidence tampering, invented email/time, missing/inverted prohibitions, direct conflicts, duplicate IDs/evidence, omitted/misclassified clauses and assertion failures.

These are functional tests for a limited deterministic grammar, not accuracy measurements for multilingual AI. Validation shares grammar primitives with extraction and cannot prove arbitrary natural-language meaning. No hardware, model inference, speech recognition or hosted GitHub Actions run was tested.

## Installation issues resolved

The first install failed because the sandbox could not write the existing pnpm store. The installation was rerun with permission. Registry requests were slow and retried native packages. The next install ended nonzero because pnpm blocked esbuild's postinstall script. The project explicitly allows only esbuild in pnpm-workspace.yaml; a subsequent frozen-lockfile install completed successfully. No global Node/pnpm changes were made.

# P1 Editable Web UI release gate

Session date: 2026-10-23. Result: PASS_WITH_LIMITATIONS (all local gates passed; remote CI and other browser engines unverified).

## Independent P0 preflight

The working directory was `/home/waldo870/projects/codeswitch-workbench`. `git status --short` was empty. Branch was `feature/p0-text-workcards`, HEAD `551118a55943a5894482f35f44cf8910098f0cbe`; main remained at `d890714`. No origin was configured. `git branch -vv` showed only the P0 branch and main. The supplied GitHub URL was queried directly with `git ls-remote https://github.com/waldo870/codeswitch-workbench.git`: exit 0, no refs returned. No fetch, remote configuration, push, visibility change or merge was performed. An empty ref advertisement does not provide a remote P0 commit to compare.

Node v22.23.2 and pnpm 11.25.0 were retained. Before implementation, P0 typecheck passed, Vitest passed 43/43, and CLI produced three draft cards and the production prohibition with valid evidence. P1 branch was created from this verified HEAD. README, contracts, parser, validator, tests, package manifest and CI were read.

## Final commands actually run

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS, exit 0; lockfile up to date |
| `pnpm typecheck` | PASS, exit 0 |
| `pnpm test` | PASS, 4 files, 101 tests |
| `pnpm build` | PASS, TypeScript and Vite production bundle |
| `pnpm demo` | PASS, exit 0; 3 cards, 1 constraint, validation PASS |
| `pnpm test:browser` | PASS, 6 real Chromium tests (3 desktop + 3 mobile) |
| `git diff --check` | PASS, no whitespace errors |
| `git status --short` before staging | Only intended P1 changes and the documented parser hardening |

The 101 Vitest tests consist of the unchanged original 43 P0 tests, 37 P1 state/storage/security tests and 21 React component/integration tests. The browser tests use the actual built application and existing cached Chromium (Playwright 1.64.1, browser cache revision 1248). No browser download was needed locally. CI is configured to install Chromium; hosted GitHub Actions has not run for this delivery.

## Acceptance evidence

- Initial example produces calendar, task and email draft cards, all draft. Original deployment prohibition remains in the constraints panel, never an extra deployment card.
- Exact UTF-16 evidence is highlighted and retained through edits and reload. Original input and parser fields remain separate from user-edited fields.
- Task confirmation changes actual state, applies only to one card, and enables JSON export. Further edits clear confirmation and return it to draft.
- Reject preserves original evidence and history but excludes the card from export.
- Title-only `Deploy to production`, Chinese equivalent, and normalized action/target deployment edits cannot be confirmed. Unknown titles, incomplete time, missing email address/body, unresolved source text and unsupported required-constraint workflows fail closed.
- Export tests use a real browser download event, save/read the JSON, and run `validateExport`. Only the confirmed task is present while calendar is rejected and email remains draft. Constraint/provenance metadata and executed=false remain present.
- Valid state reloads after page refresh, including confirmations and user-written email fields. Invalid JSON/schema shows recovery UI without overwriting original stored data. Clear requires explicit consent; cancel preserves data. Storage write/removal failures are surfaced.
- Empty input disables analysis. Reanalysis asks before overwriting work. HTML/script-like input and edited titles render as text; no injected element or arbitrary code runs. Inherited object targets (`constructor`, `__proto__`) remain unresolved.
- Desktop 1280×900 and mobile 390×844 runs have no horizontal overflow. Keyboard Enter activates Analyze. Labels, details/summary and explicit status text are exercised. Page errors and external requests in the primary browser flow were both empty.
- Local Noto Sans TC Variable font loading was asserted in Chromium. Desktop/mobile screenshots are generated under ignored `test-results/*/workbench.png`; screenshots were inspected during development. The README contains a complete reproducible walkthrough.

## Implementation changes and resolved findings

P0 contracts, CLI and the original tests were retained. One P0 engine security fix restricts the target lookup to own properties, preventing inherited Object keys from becoming unsupported field values and breaking browser rendering. New tests cover this behavior without changing original expectations.

Development surfaced and resolved a missing CSS module declaration, a NodeNext user-event import mismatch, ambiguous text selectors in UI/browser tests, overwritten package scripts during dependency installation, success-message coloring, and absent CJK system fonts. A complete font package download timed out; the smaller variable font package installed successfully and is pinned in the final lockfile. The failed complete font package is not a dependency. pnpm cache access required sandbox permission; no global runtime versions were changed.

Production output is approximately 4.7 MiB including local Unicode font subsets. Main JavaScript is approximately 242.7 kB (76.3 kB gzip); CSS including font-face declarations approximately 120.9 kB (48.9 kB gzip). Browser font loading is subset-dependent and served from the same local origin. The font OFL notice is included in the built static assets.

## Explicit limits / not tested

Only Chromium desktop/mobile emulation was tested; Firefox, Safari, real mobile devices, screen readers and production hosting were not. No hosted Actions run, remote push, ASR, LLM, Hailo/UGen300, external email/calendar action, or deployment occurred. There is no general natural-language contradiction proof, authenticated audit, encrypted storage, tab synchronization or service-worker installation. Required constraints conservatively block confirmation; unknown source text requires clarification. Complete source text is intentionally included in exports, so users should review provenance before sharing.

All P1 delivery requirements are implemented within the documented deterministic boundary. P2 has not started.

# P2A Local LLM Evaluation release gate

Session date: 2026-10-23. Framework gate: **PASS_WITH_LIMITATIONS**. Actual model evaluation: **NOT_RUN**.

## Verified starting point and boundaries

Preflight was readonly. Working tree was clean, branch feature/p1-editable-web-ui, HEAD `12b3467591b0d1fd52eea86d36f70e7d701867d9`, with P0 and initial main commits retained. No origin was configured. Node v22.23.2 and pnpm 11.25.0 were unchanged. P1 typecheck, 101 tests, build and demo were rerun successfully before creating feature/p2a-local-llm-evaluation. P0/P1 contracts, parser, validators, UI, CLI and existing tests were read/reused and have no source diff from the P1 baseline in this delivery.

Ollama executable was absent and loopback API probes returned connection refused inside and outside the sandbox. No model inventory/version/digest could be established. No model, GPU SDK or runtime was downloaded/installed/upgraded. Mock responses and the temporary local HTTP server are explicitly software tests, not inference. The readonly GPU query reported driver unavailability; it did not establish GPU capability.

## Actual final commands

| Command | Observed result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS; exit 0 |
| `pnpm typecheck` | PASS; exit 0 |
| `pnpm test` | PASS; 8 files, 172 tests (101 unchanged regression + 71 new) |
| `pnpm build` | PASS; static UI asset hashes match P1 |
| `pnpm demo` | PASS; 3 draft cards, 1 production prohibition, evidence valid |
| `pnpm test:browser` | PASS; 6 Chromium tests across desktop/mobile |
| `pnpm benchmark:baseline` | PASS execution; all 60 cases scored, semantic success 32/60 |
| `pnpm benchmark:llm --probe-only` | Expected exit 2; records NOT_RUN, no inference |
| `pnpm benchmark:llm` live inference | NOT_RUN; local Ollama/model prerequisites absent |
| `pnpm benchmark:report` | PASS; aggregation only, no provider calls |
| `git diff --check` | PASS |
| `git status --short` before staging | Only intended P2A additions/configuration/documentation changes |

The 60-example fixed gold dataset was created and hashed before recorded benchmarking; it was not revised in response to scores. Unit tests verify hash/group counts, metric denominators, omissions, extras, order-independent anchor matching, refusing all cards, NOT_RUN records and report aggregation. Adapter tests cover request schema/flags, JSON/schema/provider errors, timeout/caller abort, connection refusal, byte limits, input limits, loopback URL rejection, redirects and cloud-model rejection. Real HTTP transport was exercised against a temporary loopback test server; no actual model test passed or ran. Proposal tests cover UTF-16/duplicate/fabricated evidence, unsupported fields/dates/emails, bilingual and multi-intent input, independent constraint patterns, injection, lost prohibitions and normalization of claimed confirmation to draft.

## Actual benchmark observations

- Dataset: benchmark-v1.0.0; SHA-256 `d0ada927031c7d88bfc0088b95e54d0d597e85e7dd1924732be14b8768767c94`.
- Baseline complete: 32/60; intent exact 39/60; card count 38/60; slots 104/171.
- Baseline constraint recall: 3/13; unsupported action rate 0/39; evidence validity 77/77.
- Safety-eligible blocking: 28/28, often by returning unresolved input, not by understanding all constraints.
- Final recorded baseline P50/P95: approximately 0.016442 / 0.139721 milliseconds, single pass, preliminary host CPU measurement.
- B/C: NOT_RUN, null scores, zero inference examples. No comparison winner can be declared.
- Report files were inspected for synthetic content and size (approximately 440 KB combined). Baseline and aggregated JSON include raw/final records; NOT_RUN files contain no fabricated model output. These small reproducibility artifacts are committed.

Development tests exposed a fixture whose evidence used incorrect capitalization; the exact grounding verifier correctly rejected it. The fixture was corrected to match its mock source, not by loosening evidence validation. Type errors in a union-typed test helper were also corrected. No original tests or gold labels were removed or relaxed. Ajv was installed with pnpm cache permission; its license is recorded separately. Final source fingerprint and dirty/base commit metadata are retained with each run so the working-tree measurement can be tied to the committed source.

## Remaining limits

Live Ollama/model quality, digest, runtime license, real GPU inference and model latency are unverified. The 60 synthetic cases are not independently annotated and do not prove general semantic accuracy or production safety. Independent verification remains finite/lexical and may reject valid paraphrases or miss unfamiliar associations. Browser verification covers existing Chromium emulation only. Hosted GitHub Actions was configured but not run; no remote was configured, no push/merge/visibility change occurred. P2B, speech and UGen300 integration were not started.

# P2A.1 LM Studio runtime release gate

Session date: 2026-10-23. Local software gate: **PASS_WITH_LIMITATIONS**. Live provider smoke and full model benchmark: **NOT_RUN**.

## Preflight and scoring audit

Readonly preflight verified clean working tree, expected branch feature/p2a-local-llm-evaluation and HEAD 2166bec62f0cc59b185054136572f617dd7c2f6d. Origin was absent. Node v22.23.2/pnpm 11.25.0 were retained. Typecheck, original 172 tests, build, demo and six Chromium tests passed before creating feature/p2a1-lmstudio-live-evaluation. Existing scoring/runner/report, dataset, comparison JSON and methodology were reviewed.

Exact dataset SHA-256 remains d0ada927031c7d88bfc0088b95e54d0d597e85e7dd1924732be14b8768767c94. Gold and manifest have no diff. Recall 3/13 counts gold constraint tuples in 11 examples; review/blocking 28/28 counts safety-eligible examples, with a 10-example overlap. Review credit can result from unresolved text or missing fields, not recognized constraints. These measures are not interchangeable.

A minimum counterexample test first failed: a target named tomorrow was incorrectly equated with 明天, yielding two correct slots instead of one. Date aliases now apply only to time slots. A positive time-equivalence test and versioned scoring metadata prevent accidental relaxation or mixing old scored runs. Gold labels were not changed. The fixed 60-case baseline remains complete 32/60, intent 39/60, count 38/60, slots 104/171, constraint recall 3/13, unsupported actions 0/39, evidence 77/77, review/blocking 28/28.

## Environment boundary

Neither lms nor ollama was on PATH. Known user-local LM Studio CLI/cache/model paths were absent. No supported CLI status/version/list command could therefore run. `/v1/models` on 127.0.0.1:1234 returned connection refused both inside and outside the sandbox. No Windows/host/LAN/public IP alternative was attempted. No runtime/model/driver/OS or network setting was installed or changed. Frozen pnpm install reused the existing dependency graph with no new dependencies.

The official LM Studio Structured Output document was retrieved and inspected through HTTPS using curl after the web connector returned an expired-token error. This was documentation access, not a model request.

## Actual commands and observations

| Command | Result |
| --- | --- |
| pnpm install --frozen-lockfile | PASS, exit 0; no dependency/lockfile change |
| pnpm typecheck | PASS |
| pnpm test | PASS: 204 tests in 10 files; all original 172 retained, 32 new tests |
| pnpm build | PASS; P1 static asset hashes unchanged |
| pnpm demo | PASS: 3 cards, 1 production prohibition, valid evidence |
| pnpm test:browser | PASS: 6 desktop/mobile Chromium tests |
| pnpm benchmark:baseline | PASS execution; 60 cases, fixed semantic scores as above |
| pnpm benchmark:llm --probe-only | Expected exit 2; Ollama NOT_RUN |
| pnpm benchmark:llm --provider=lmstudio --probe-only | Expected exit 2; LM Studio NOT_RUN |
| Live LM Studio smoke/full command | NOT_RUN: required service/model unavailable |
| pnpm benchmark:report | PASS; existing actual results only, no inference |
| git diff --check | PASS |
| git status --short before staging | Only intended P2A.1 code, tests, documents and reports |

New tests cover LM request format and fixed parameters, identity checks, invalid JSON/schema, truncation/refusal/tool calls, HTTP failure, byte limits, timeout/abort, absent model/service, endpoint restrictions, local DNS-name canonicalization, forbidden-operation omission, English confirmation prerequisite, nonconflicting multi-intent, fixed smoke IDs, smoke-to-full gating and NOT_RUN output. Shared transport and decoder retain all Ollama regression tests. Unit smoke fixtures are mock-only and saved only through test callbacks, never committed as live results.

The live report reports smoke=NOT_RUN and fullLiveBenchmark=NOT_RUN, with B/C null summaries and empty cases. Model ID/digest/version/quantization and GPU participation are unknown. There are no actual model errors to rank. The five existing deterministic failures in MODEL_EVALUATION.md remain clearly labelled baseline observations. Local reports contain synthetic benchmark text only and were inspected for size/content before commit. Actual per-example latencies, P50/P95, tuple/case denominators, source fingerprints and timestamps are in the JSON artifacts.

## Delivery boundaries

P1 UI, P0 contracts/engine/CLI, original UI/browser tests and frozen gold/manifest have no diff from P2A. No push, merge, origin or visibility change occurred. A real comparison and P2B decision remain deferred until an owner-provided loopback runtime is available in the same execution environment. See MODEL_PROVENANCE.md for the minimum manual steps. No ASR/Hailo/UGen300 work was started.

# P2A.4 recovery, adapter hotfix and live smoke

Session date: 2026-10-28. Software regression: PASS. Live full smoke: FAIL (0/8). Formal 60-case model benchmark: NOT_RUN.

## Recovery and provenance

Starting HEAD was 5034e978bfab328233b97e223b348118f27e34ca with exactly two modified reports: reports/p2a1-lmstudio.json and .md. Full JSON/Markdown diffs were reviewed. All recorded source strings matched frozen synthetic fixtures, model identity was Gemma, and the seven provider-envelope failures plus one timeout matched the previous diagnosis. Report hashes matched the prior readonly diagnostic session. No credential patterns or unknown source inputs were found.

Only those two paths were staged, staged diff/check were inspected, and they were committed as 011d31c3b2e3e7265cf3d5cd9122b60514d3ae3f (`docs: preserve p2a1 live smoke diagnostics`). The tree was clean before feature/p2a4-adapter-hotfix was created. No broad git add, stash, reset, cleanup, merge or push was used.

## Actual software gates

| Command | Result |
| --- | --- |
| pnpm install --frozen-lockfile | PASS; existing dependencies retained |
| pnpm typecheck | PASS |
| pnpm test | PASS: 226 tests / 12 files; original 204 retained, 22 new |
| Adapter-specific Vitest invocation | PASS before live inference; shared Ollama regressions retained |
| pnpm build | PASS; static UI assets unchanged |
| pnpm demo | PASS: 3 cards, 1 constraint, validation passed |
| pnpm test:browser | PASS: 6 Chromium desktop/mobile cases |
| git diff --check | PASS |
| pnpm smoke:lmstudio | Executed once; expected exit 2 because full smoke failed |

Tests cover missing/null/empty tool arrays, actual tool calls, invalid types, finish reasons, refusal, truncation and identity mismatch. Diagnostics tests verify phase/status/code, bounded redacted failure previews and proposal=null. Full-gate tests reject schema/evidence-only output, missing prohibitions and blanket refusal while allowing genuinely appropriate unknown-intent abstention. Original tests were not deleted or relaxed. Prompt, schema, independent constraint verifier, fixed smoke IDs, dataset/gold/manifest, P0 engine and P1 UI have no diff from the recovered baseline.

## Actual live revalidation

Model gemma-3-4b-it was already loaded and IDLE, Q8_0, context 8192. lms CLI commit was 69d945a. No model download, reload, switch, driver/runtime change or timeout increase was performed. Parameters stayed temperature=0, seed=42, max_tokens=4096; request timeout remained 60000 ms. The exact eight fixed cases ran once with no retry and no 60-case inference.

| Stage | Pass / all 8 | Interpretation |
| --- | --- | --- |
| Provider | 7/8 | All seven completed responses accepted; one timeout |
| Schema | 7/8 | All seven completed outputs parsed and passed the unchanged schema |
| Evidence | 5/8 | Two completed cases fabricated evidence; timeout unassessed |
| Constraints | 0/8 | Seven completed cases failed; timeout unassessed |
| Fixed-gold semantics | 0/8 | Seven completed cases failed; timeout unassessed |
| Full | 0/8 | No unsafe full benchmark was unlocked |

All seven completed responses avoided the former empty-tool-array false rejection. They still added a spurious required constraint. The three restriction cases retained 0/4 expected Gold tuples: deploy prohibition, delete prohibition, publish prohibition and user-confirmation prerequisite were absent. Deployment/publish cases fabricated quotations and tasks; the ambiguous request invented a document-check task. The email draft retained its null fields but added an unsupported required constraint. The independent verifier admitted zero draft cards. This is MODEL_QUALITY_FAILURE, not an adapter success claim about semantics.

See reports/p2a4-smoke.json and .md for each stage, validation reason, latency and runtime evidence. These curated reports contain no raw model body/source utterance. Bounded redacted previews stay in ignored reports/local-diagnostics/. Report content/size and credential patterns were reviewed before staging; local raw files were not staged.

## Timeout evidence and limits

Multi-03 timed out again at 60003.229 ms, before an HTTP envelope. Its diagnostic identifies provider/model/case, transport phase and TIMEOUT. The model was preloaded. Seven numeric LM Studio log-stat records matched completed requests by token counts and sequence: 6.315–6.364 tokens/s, 9.984–10.097 seconds to first token, 35.331–42.937 seconds total inference time. The aborted request emitted no completion statistics. Slow generation is observed, but its exact loading/queueing/generation breakdown remains TIMEOUT_UNRESOLVED. No deadline change or retry concealed it. GPU participation is NOT_VERIFIED.

The owned statistics listener was stopped after the run; the LM Studio server/model remained loaded and IDLE. No raw logger content or unrelated user text was captured into tracked reports. There is not enough model reliability evidence for the formal benchmark or P2B. A separately authorized comparison with another local instruction model on the same frozen smoke is reasonable; no model superiority or automatic model change is implied.


## P2.5 model comparison completion (2026-10-28)

Starting branch feature/p2a4-adapter-hotfix, HEAD7a17a96741e08d5b75de9c591f9eabe03e0f1b2d, clean worktree and verified226/226 Vitest +6/6 Chromium. New branch feature/p25-model-comparison. No unknown owner changes, remote operation or merge.

| Actual command | Result |
| --- | --- |
| pnpm install --frozen-lockfile | PASS, already up to date; no new dependency |
| pnpm typecheck | PASS |
| pnpm test | PASS241/241,13 files; all original226 retained,15 new research tests |
| pnpm build | PASS |
| pnpm demo | PASS,3 cards,1 constraint, validation PASS |
| pnpm test:browser | PASS6/6 desktop/mobile Chromium |
| pnpm benchmark:baseline | Actual run, complete32/60, constraints3/13 |
| pnpm benchmark:research --model=gemma-3-12b-it | 60/60 requests attempted;18 schema-valid completions,42 TIMEOUT; model/product gate FAIL |
| pnpm benchmark:research:report p25-gemma-3-12b-it | PASS; renders existing actual data without inference |
| git diff --check | PASS |

New mock-only tests cover continued execution after timeout, separate semantic denominators, unchanged proposals with invalid evidence / omitted constraints, failure and total-time limits, unavailable runtime stop, abort/case-ID propagation, invalid CLI endpoint/model flags, report NOT_EVALUABLE states, and truthful in-progress checkpoints. They do not count as inference. Existing strict gate tests still prevent failed smoke from invoking60 cases. No tests, gold labels or safety rules were removed or weakened.

Live parameters stayed fixed: temperature0,seed42,max_tokens4096,60s/case,65min total,60 provider-failure ceiling, no retry. Actual duration3439.012s. Runtime remained CPU AVX2; no GPU inference. A publisher-matching file SHA-256 and successful load establish model-file integrity. Raw B complete2/18 and verified C3/18 are conditional on18 valid outputs; all are unknown-input handling. Operational yields2/60 and3/60 are not semantic-error counts for timeouts. Raw constraint recall1/10, verified0/10;3 gold tuples unassessed due timeout. P50/P95 all attempts60001.55/60002.69ms. See MODEL_EVALUATION.md for every denominator and scorer false positives.

P2.6 UI integration did not pass capability/safety/latency qualification; no Experimental mode or bridge was implemented. Its feature tests are NOT_APPLICABLE, not PASS. P1 browser behavior remains unchanged. No second 60-case4B run, true GPU benchmark, complete 60-inference12B semantic benchmark, hosted Actions, ASR or UGen300 test occurred. No push, merge, model download, driver update or third provider. The original Windows weight file remained intact. Runtime CPU selection was restored after a failed installed-Vulkan hardware survey;12B was left loaded/IDLE at the end of inference.

## P2 final checkpoint (2026-10-28)

Finalization retains 241/241 Vitest and6/6 Chromium; frozen install, typecheck, build, CLI demo, deterministic benchmark32/60 and diff check passed again. GPU Smoke/Research NOT_RUN: host Vulkan survey failed and prior Gemma HIP logs contain HSA0x1010. No unchanged failing model test was repeated. Backup checksums match the current package list, host rocminfo and HSA CMake file. Initial authorized GitHub feature backup at5f03e2c was verified and Actions run40622963559 completed successfully; closing-push CI is a separate run and must not inherit that status. Main remains local initialization only. See [P2 final report](P2_FINAL_REPORT.md) and sanitized GPU evidence for final engineering/model/product boundaries.


## Windows LM Studio recovery (2026-10-28)

Starting HEAD a6460f1288ad2873e75929ff72f81940e34ef87b verified with clean worktree. Local branch feature/p2-windows-lmstudio-recovery. Frozen install, typecheck, Vitest261/261 (original241 retained plus20 gateway-boundary tests), build, demo3cards/1constraint and Chromium6/6 passed. The tests cover explicit opt-in/default-loopback behavior, trusted route parsing, ambiguous/missing gateways, non-WSL, mismatched/public/metadata/obfuscated hosts, URL escapes/ports/credentials/paths/query/fragment and unchanged Ollama restrictions. One redundant newly drafted mock assertion was corrected/removed before final validation; no original test or safety rule was removed.

Actual Windows JSON Schema probe PASS in2581.67ms. Fixed Smoke Provider8/8,Schema8/8,Evidence7/8,Constraints6/8,Semantics3/8,Full3/8; strict quality FAIL, command exit2 as expected. Research under explicit owner authorization:60/60 valid,0 timeout/JSON/schema failures,527993.50ms total; raw complete20/60,verified16/60. No fake responses, prompt tuning, retries or gold/scorer/schema/strict-gate changes. GPU evidence comes from Windows process/runtime-module correlation and W7900 Compute93%/dedicated-memory32,835,096,576-byte snapshot, not API success or DEVICE=Local. Full layer count and tokens/s remain unverified. No Windows model reload/unload, firewall/binding/driver/ROCm change occurred. Independent verification still has finite coverage (en-05 reminder type gap), and LLM UI remains disabled. No hosted Actions/new push/merge occurred for this local recovery commit. See recovery/raw/runtime reports for all numerators, denominators and failure IDs.

## P4 Prep (2026-10-28)

P4 starts from the verified public `main` release SHA `89ea5a76ccbea2c9cccbbd581deaa162d215151d`; the local-only implementation branch is `feature/p4-hailo-readiness`. This phase adds provider/runtime provenance, a registry that creates a fresh unconfirmed transcript session per provider run, a versioned bounded JSON worker contract, Python mock/unavailable responses, and an ASR benchmark report contract with explicit CER/WER/term/constraint/negation/raw/reviewed-workflow/latency denominators. Mock run records remain labelled `MOCK_ONLY` and have null evaluation metrics.

The Python worker protocol tests use only the standard library. Normal worker mode reports `HARDWARE_UNAVAILABLE`; `--mock` emits a conspicuous sentinel and no Hailo device claim. The Hailo TypeScript adapter verifies canonical WAV identity, model/request fields and the SHA returned by the worker. There is no HailoRT implementation, Hailo device, HEF, hardware result, or human recording dataset. No SDK, driver, model, or HEF was installed or downloaded. See [P4 readiness](P4_HAILO_READINESS.md) for source/version caveats and Stage II steps.

P4 final local gates: `pnpm install --frozen-lockfile` PASS; `pnpm typecheck` PASS; `pnpm test` PASS (322/322, 21 files); `pnpm build` PASS; `pnpm demo` PASS (3 draft cards, 1 prohibited constraint); `pnpm test:browser` PASS (10 passed, 4 existing live-ASR cases skipped because this environment did not run the owner-configured Windows ASR service); `git diff --check` PASS. Mock protocol tests are not Hailo Live tests. `HAILO_LIVE_STATUS=NOT_RUN`.

## P4E/P4F — multi-session offline persistence (2026-10-28)

P4A–P4D release SHA `98c8dd5e78aea84ff92d329f13c2af7147547e08` was verified on public `main` before this local-only feature branch. P4E adds IndexedDB workspaces and speech drafts, multi-session open/delete, autosave state reporting, validated complete Workspace JSON import/export, legacy localStorage v1 migration and a generated versioned app-shell Service Worker cache. Imported confirmation history is discarded and the session receives a new ID. Original text/evidence/constraints are reconstructed and validated; stored audio is metadata plus SHA-256 only, never audio bytes. Failed storage is reported as unsaved; corrupt data is retained and not restored as a valid card.

P4F browser evidence is a simulated outage: Playwright first establishes the production preview service-worker cache and a saved IndexedDB workspace, then marks the browser context offline and reloads. The UI/session/cards/constraints reopen and ASR remains explicitly unavailable. This does not represent a physical network disconnect, browser restart/cold-start after a real outage, or verification across hosted origins. Windows Whisper and LM Studio are not required for the deterministic text UI; Hailo absence remains `HARDWARE_UNAVAILABLE` by existing contract tests. Mock and skipped Live tests are not counted as hardware/ASR passes.

Actual P4E/P4F gates: `pnpm install --frozen-lockfile` PASS; `pnpm typecheck` PASS; `pnpm test` PASS (324/324, 22 files; all 322 previous tests retained plus 2 storage contract tests); `pnpm build` PASS; `pnpm demo` PASS (3 draft cards, 1 prohibited constraint); `pnpm test:browser` PASS (24 passed, 4 existing opt-in Live ASR tests skipped); `git diff --check` PASS. Browser additions cover multiple sessions/deletion confirmation, validated non-overwriting import and confirmation invalidation, legacy evidence/constraint migration, offline shell + IndexedDB reopen, quota failure, corrupt IndexedDB provenance, and corrupt localStorage retention/explicit clear. `HAILO_LIVE_STATUS=NOT_RUN`, `P3C_REAL_BILINGUAL_SPEECH=NOT_RUN`, `REAL_NETWORK_DISCONNECT=NOT_RUN`.

## P4E/F release and P4G feedback workflow (2026-10-28)

P4E/F was reverified from feature HEAD `5e2554b92bc29536cf89200d096d626de039b220` on top of origin/main `98c8dd5e78aea84ff92d329f13c2af7147547e08`. Frozen install, typecheck, 324 Vitest tests, build, CLI demo and browser suite passed (24 passed, 4 existing Live ASR tests skipped). GitHub Actions initially exposed a reload/persistence race; navigation warning and explicit save-state synchronization were added in `b22883ae6f6f02c97bfca8b727864117ca895085`. The feature was fast-forwarded and pushed without force. Remote main was verified at that SHA and GitHub Actions run `40664918000` completed successfully.

P4G started from that verified main on `feature/p4g-feedback-improvement`. Added seven Vitest tests and four browser scenarios (desktop and mobile). Final commands:

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS; lockfile up to date |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS; 331/331 across 23 files |
| `pnpm build` | PASS; production Vite bundle generated |
| `pnpm demo` | PASS; 3 draft cards, 1 prohibited constraint, validation PASS |
| `pnpm test:browser` | PASS; 32 passed, 4 existing Live ASR tests skipped |
| `git diff --check` | PASS |

P4G browser coverage includes optional rating/comment, feedback persistence and workspace isolation, deterministic proposal editing, explicit approval/rejection, lifecycle transitions and history, unverified test-note labeling, complete Workspace JSON export/import status reset, HTML rendered as text, offline reload, corrupt provenance quarantine, and IndexedDB v1 row migration preserving evidence and constraints. Editing feedback revalidates source provenance and clears any linked stale proposal/session so it must be reviewed afresh. No shell, GitHub, cloud or external work action is invoked.

Limits: browser checks use Playwright Chromium desktop/mobile emulation only; four Live ASR cases were skipped. P4G is local-only and was not pushed or merged. IndexedDB is local and unencrypted. User feedback remains subjective; proposals and test notes are not verified defects or test results. P3C real bilingual speech and Hailo Live remain NOT_RUN.

## P5D.2 scoring-contract research (2026-10-30)

Added a benchmark-only scoring-v2 audit, a versioned bilingual constraint/prerequisite contract, a small conservative constraint grammar, and a per-card draft review prototype. The historical 100+300 Gold dataset and P5D v1 reports remain unchanged. The independent validation v4 fixture has 24 original authored cases and a pinned SHA; earlier exposed sets (66 cases combined) are classified as development calibration. Historical held-out candidate evaluation remains NOT_RUN. Result details and metric denominators are in [P5D.2 research](P5D_2_SCORING_AND_CONSTRAINT_RESEARCH.md) and the generated `reports/p5d2-evaluation.*` files.

P5D.2 measured Development complete success 17/60 original cases and independent validation v4 1/24. Development constraint recall/scope 159/240 and 124/240, prerequisite direction 22/48, negation flips 14/60 synthetic deletions, unsupported raw actions 14/245, unsupported constraints 35/159, evidence location/lexical alignment 443/443, draft retention 245/245, false rejection 0/194. Independent validation constraint recall/scope 13/19 and 12/19, prerequisites 4/4, unsupported actions 0/26, unsupported constraints 2/14, evidence location 45/45 (lexical alignment 44/45), draft retention 27/27 and false rejection 0/23. The two earlier authored sets (66 cases combined) were viewed during implementation and are reported only as development calibration. The lexical evidence score is not a human semantic entailment evaluation. This experiment is synthetic text only, not ASR, and is not connected to P1.

Final P5D.2 gates: `pnpm install --frozen-lockfile` PASS; `pnpm typecheck` PASS; `pnpm test` PASS (360/360 across 27 files); `pnpm build` PASS; `pnpm demo` PASS (3 draft cards, 1 prohibited constraint, validation PASS); `pnpm test:browser` PASS (32 passed, 4 existing opt-in Live ASR tests skipped); `pnpm analyze:p5d2` PASS (historical P5D fixture/report hash check passed, output v2 JSON/Markdown, historical held-out candidate evaluation NOT_RUN); `git diff --check` PASS. Browser skips are not counted as passes. No live ASR, P1 integration, hardware test, remote operation, or model download occurred.
