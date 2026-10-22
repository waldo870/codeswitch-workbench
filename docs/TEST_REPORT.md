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
