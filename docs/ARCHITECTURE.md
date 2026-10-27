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


## P1 browser architecture

React and Vite serve a static browser application from `index.html` and `src/web/main.tsx`. `App.tsx` owns input, workspace, recovery messages and destructive-action consent. `WorkCardEditor` renders labelled fields, and `EvidenceViewer` slices the immutable input for highlighted text. CSS provides a two-column desktop workspace and a single-column mobile layout. No backend, hosted Site, external execution adapter or network inference is involved.

P0 contracts, CLI and existing tests are unchanged. The engine has one compatible hardening fix: target lookup accepts only own properties, so inherited keys such as constructor and __proto__ remain unresolved instead of becoming invalid targets. `EditableCard` is a P1 wrapper that extends only email body to allow user-authored text, preserving the P0 parser contract. The source extractor output remains immutable and draft-only; the reviewed card carries its own draft/confirmed/rejected state.

### Workspace v1 and transitions

`state/workspace.ts` implements create, edit, confirm, reject, restore, export and export validation. A card state contains `current`, `history`, `revision` and `confirmedRevision`. Each event is an edit (field/before/after), confirmation (revision) or rejection. Continuous edits in the same field are coalesced; review events prevent coalescing across decisions. Edits clear confirmation and set draft; rejection clears confirmation without deleting source. Confirmation requires draft status, exact revision and all safety checks. Reconfirm by editing and reviewing again.

Restoration begins with the deterministic parser applied to original input, checks the immutable saved extraction, reconstructs each state by replaying strictly shaped events and compares the saved materialization exactly. Extra keys, changed evidence, missing constraints, edited fields without provenance and stale confirmation fail closed. Functions used by the UI validate their inputs; export does not rely on button visibility for safety.

### Edited-card safety boundary

The original P0 validator still checks source evidence and constraint preservation. A separate P1 validator uses normalized action/target allowlists and title agreement; it never parses edited prose through P0 to claim it was source-derived. A title-only production deployment is blocked explicitly, and any unknown title is ineligible for confirmation. Structured deploy/production conflicts with the original prohibition regardless of case/spacing. Scope wildcard blocks all matching actions. Email draft action cannot be edited into send.

For tasks/calendars, check/review targets are the P0 closed target list and deploy targets are production/staging. Titles must describe that operation; arbitrary alternate descriptions are not approved. Calendar confirmation requires the supported exact relative time or a validated ISO-like local date-time; no calendar event/timezone conversion occurs. Email confirmation requires name, syntactically plausible email, English/Chinese language and body. Email deliverability/identity and freeform body semantics are not verified. Draft title must match recipient/language, optionally with follow-up.

Any unresolved original source, failed P0 source validation or `required` constraint blocks confirmations until the input is clarified. P1 does not implement a proof that required constraints have been satisfied. Missing fields on unrelated draft cards do not block export of valid confirmed cards. Rejected cards stay in the local workspace but are omitted from export.

### Storage and export trust

`storage/local-workspace.ts` wraps a small StoragePort interface. Browser storage access, JSON decoding, size limits and schema failures are caught. Corrupt data is not automatically overwritten. UI reports save failures honestly and keeps unsaved state in memory. Clearing requires consent and removes only the versioned app key. Original input buffer changes are not silently reanalyzed.

Export schema v1 contains kind, originalInput, constraints, confirmed card states and executed=false. Export validation reconstructs omitted baseline cards internally, replays selected cards and compares the canonical export. No unknown/duplicate IDs or extra executable flags are accepted. Downloads use a locally created Blob URL and an explicit click; the object URL is revoked afterward.

React renders untrusted text using escaped text nodes. No eval, command execution, HTML injection sink, analytics or text upload exists. All resources, including Noto Sans TC, are served locally. History is consistency metadata, not authenticated identity or a tamper-proof signature. Same-origin scripts and local users can rewrite storage; tabs are not synchronized. There is no service worker or encrypted storage.

### Test layers

Unchanged P0 tests check parser/source behavior. P1 state/storage tests exercise schema replay, conflicts and malicious materialized states. React Testing Library tests cover labelled interactions, confirmation, persistence recovery and XSS text rendering. Playwright tests the built bundle in desktop/mobile Chromium with real download parsing and export revalidation, page-error monitoring, horizontal overflow checks and refresh. The browser test server is managed and stopped by Playwright. CI runs install, typecheck, Vitest, CLI, build, Chromium installation and Playwright.

## P2A evaluation boundary (Node CLI only)

P0/P1 source and UI behavior are retained. `src/llm/types.ts` defines an asynchronous provider-neutral ExtractionProvider returning an application-owned source, identity, raw text, schema status, proposal, errors and duration. The proposal reuses P0 card field shapes and adds evidence quotes, an intent type and prerequisite constraints. It is not a confirmed WorkCard contract.

`ollama-adapter.ts` uses Node fetch against literal loopback HTTP only; endpoint credentials, non-root paths, query/fragment, DNS names and non-loopback destinations are refused. Redirects are disabled. Input, streamed response bytes and request duration are bounded. Only version/tags/show/chat paths are supported. Installed model inventory and show metadata are checked before chat; cloud/remote models are rejected. The CLI has no URL option. Neither P1 React nor a persistent backend calls Ollama.

`proposal-schema.ts` provides the JSON Schema sent to Ollama and a separate Ajv validator. Model status/confirmation strings are raw untrusted claims. `proposal-validation.ts` locates exact unique evidence with UTF-16 indices, scans a finite independent set of prohibitions/requirements/prerequisites and checks lexical field support, title consistency and source coverage. It never imports gold labels or asks the LLM to judge itself. An invalid proposal admits no cards. Admitted WorkCards always receive trusted draft status and requiresConfirmation=true; no execution/export integration is provided.

`evaluation/dataset.ts` verifies the fixed benchmark manifest and exact bytes. `runner.ts` evaluates A and compares B/C using the same extraction call; it preserves raw errors before any interception. `scoring.ts` scores all three methods with the same gold labels and explicit denominators. `report.ts` writes JSON/Markdown and aggregates recorded runs without calling a provider. Raw provider errors, final refusals and accepted draft coverage are separately inspectable.

The P2A verifier is intentionally conservative and incomplete. Evidence strings can be true while an association or omission is wrong. Known patterns are not general semantic understanding. The benchmark tests both model predictions and validator limits; schema validity is never reported as semantic accuracy. See EVALUATION_METHODOLOGY.md for metric definitions and trust limits.

## P2A.1 LM Studio adapter

`local-transport.ts` provides bounded JSON HTTP, redirect refusal, deadlines and loopback endpoint checks for both providers. `proposal-extraction.ts` shares JSON/schema decoding and failure/result handling. Ollama retains its request format, discovery, prompt and public exports. `lmstudio-adapter.ts` supplies local model inventory and OpenAI-compatible envelope handling; it uses neither cloud SDKs nor API keys. localhost is canonicalized to a literal loopback address. P1 imports no provider code.

`evaluation/lmstudio-run.ts` handles explicit model selection, eight fixed smoke examples, conditional full evaluation and stage-aware JSON/Markdown output. B and C still share each actual extraction. The report preserves raw proposals, validator errors and admitted draft cards. Model version, digest, quantization and GPU participation are recorded only when established; missing metadata stays unknown. Smoke/NOT_RUN reports never receive numeric model scores. Report aggregation separates providers and rejects stale scoring versions. Safety patterns now also recognize the English user-confirmation-before-publish form.

## P2A.4 adapter hotfix and diagnostic boundary

LM Studio envelope validation accepts omitted, null or empty-array tool_calls as no tool invocation. Nonempty arrays, non-array values, refusal, unexpected finish reasons, truncation and model mismatch remain errors. JSON Schema, source grounding and constraint validation are unchanged.

`diagnostics.ts` adds bounded, recognizable-credential-redacted local previews. Each LM extraction carries provider/model/case ID, HTTP status, failure stage/code, finish reason and numeric usage when available. The transport exposes status only, never request headers. A provider callback failure can preserve a redacted preview while returning proposal=null. Successful proposals still require the independent verifier and cannot confirm themselves. Redaction is a diagnostic safeguard; input and provider text remain untrusted and must not contain secrets.

`smoke-assessment.ts` distinguishes provider, schema, evidence, constraints, fixed-gold semantics and full success. Existing runSmoke retains its mechanical diagnostic predicate, but the evaluation CLI now also requires every full assessment before starting 60 cases. Blanket unresolved and schema-only output cannot unlock the full benchmark. This strengthens the entry gate without changing fixed cases, prompts, gold, Schema or the independent constraint validator.

`pnpm smoke:lmstudio` is a dedicated Gemma hotfix revalidation command. It executes each frozen smoke ID once, with the original 60-second timeout and parameters, and never calls the full benchmark. It writes a scalar-only shareable summary under reports/p2a4-smoke.{json,md}; bounded provider text and source snippets remain under ignored reports/local-diagnostics/. The live runtime statistics collected for this task contain numeric counters/stop reasons only; they are not an authenticated hardware-utilization measurement.
