# Architecture and development

## Contracts and boundaries

`src/contracts/work-card.ts` exposes a discriminated WorkCard union, Evidence, Constraint, Unresolved, Extraction and TextToWorkcards adapter interface. Replace the adapter in a future evaluation without changing consumers. Only the deterministic adapter exists now. `src/index.ts` exports the public API.

Evidence uses JavaScript UTF-16 code-unit positions with an exclusive end. No normalization is performed before slicing. IDs are deterministic ordinal identifiers within one extraction, not globally unique identifiers. Unknown fields use null. Relative times never resolve against the system clock.

## Supported grammar

Clauses are separated by comma, Chinese punctuation, semicolon, newline, sentence-final dot, `but`, `then`, `and then`, or `然後`. Leading `請`, `先`, `please`, whitespace and Chinese outer quotation marks are scaffolding. Evidence covers the remaining clause exactly. There is no general quote or nested-clause parser. Whole recognized clauses must match; partial action matches never create cards.

- Actions: review/審查, check/檢查, deploy/部署.
- Review/check targets: payment webhook, sandbox credentials, sandbox, production settings, deployment plan, 報告, 測試設定. English targets may begin with `the`.
- Deploy targets: production or staging, with optional `to`.
- Calendar prefixes: 明天早上九點, 明天, tomorrow, tomorrow at 9 am, tomorrow at 9:00 am; or `remind me to`. Missing time remains null or explicitly unknown in the relative expression.
- Email: `draft [a/an] [English/Chinese] [follow-up] email [to NAME]`. NAME is one ASCII alphabetic token; it is not resolved to a person or email address. Language defaults to null, body is always null.
- Prohibited: `do not`, `don't`, `不要`, `禁止`, followed by deploy/部署/send/寄送, optionally production/staging/it (optional `to`), or 到正式環境/到測試環境; optional `yet`. Missing scope and `it` mean wildcard `*`.
- Required: `must`/`必須` followed by check/檢查 and sandbox credentials/sandbox/測試設定. Required constraints are retained as requirements, not automatically turned into tasks or claimed satisfied.
- English matching is case insensitive; output action names are canonical English.

Everything else is unresolved, including unsupported negation forms such as `never`, compound clauses joined only by `and`, conditional clauses, new targets, arbitrary timestamps and email addresses. This conservative boundary is intentional. Unknown negation stays unresolved, never an affirmative task.

## Validation and fail-closed behavior

Validation accepts unknown input, enforces exact keys/fields, unique IDs, draft-only state, confirmation flags, evidence bounds and source matches, clause coverage, correct classification/polarity and directly conflicting action/scope pairs. It independently iterates source clauses using the shared grammar, not the extraction adapter. Missing constraints, invented recipients/times/titles and extra executable flags fail validation. `assertValid` throws on invalid results. CLI exits 1 on invalid output. No result can execute anything, including valid results or unresolved-only input.

A valid unresolved item means uncertainty was faithfully retained; `requiresReview` remains true. P0 does not semantically understand arbitrary prohibitions, infer references across clauses, verify identity or implement a user authorization ledger. Shared grammar is a common trust boundary and cannot establish general semantic correctness. Tests contain explicit expected outputs and altered malicious outputs to avoid relying only on parser/validator agreement.

## Development

Use Node 22 and the pnpm version pinned in package.json. Run `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm demo`, and `git diff --check`. Add original fixtures with explicit expected results when extending grammar, plus validation mutations for new fields. CI installs from the lockfile and runs typecheck, tests and demo. CI configuration has been created; a hosted GitHub run has not occurred.

The repository has an initial main commit and an independent feature branch. No remote, deployment, external action tool, model adapter or hardware dependency is configured.
