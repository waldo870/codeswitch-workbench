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
