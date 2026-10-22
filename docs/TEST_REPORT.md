# P0 test report

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
