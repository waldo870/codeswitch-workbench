# CodeSwitch Workbench

**One Voice. Multiple Languages. Verified Workflows.**

- Project: CodeSwitch Workbench
- Competition category: Workplace AI
- Target hardware: ASUS UGen300 / Hailo-10H
- Current status: Text-only deterministic prototype
- Hardware integration: Planned / Not Tested
- No affiliation with or dependency on AgentMorph

## Product overview

An offline-first multilingual voice-to-workflow assistant concept for individual professionals who mix Traditional Chinese, English and technical terms. P0 implements the text-to-workcards core; P1 adds a React browser workspace with editing, human review, local persistence and JSON export. It does not perform AI inference or speech recognition.

## Problem statement

One spoken request can contain several tasks, a meeting, an email draft and a prohibition. Turning that request into a single action loses intent and may ignore restrictions. Each supported intent should retain its source and require review.

## Why multilingual voice-to-workflow?

Professionals often describe local context in Chinese while naming tools and technical actions in English. The intended product preserves that language switching through transcription, intent extraction, verification, editable cards, confirmation and local export. P1 implements editing, individual confirmation/rejection and confirmed-only JSON export. Voice remains a future phase. The P0 CLI remains available.

## Feature scope

P0 provides task, calendar and email_draft contracts, a deterministic extraction adapter, required/prohibited constraints, source evidence, unresolved clauses, independent validation and a CLI. No API keys, network inference, accounts, external tools or hardware are needed at runtime. Every produced card starts as a draft requiring confirmation. P1 records human edits and review decisions; no execution API exists.

## Architecture

`text → deterministic adapter → cards + constraints + unresolved → validator → CLI JSON`

The validator accepts unknown data and reconciles it against source clauses. It shares the documented grammar with the adapter, but never calls the adapter. It checks exact field values, evidence, complete clause coverage and prohibited-action conflicts. Valid means structurally/source consistent, not permission to act. `executable` is always false. See [architecture and grammar](docs/ARCHITECTURE.md).

## Quick start

Prerequisites: Node.js 22 and pnpm 11.25.0 (the installed environment versions were retained).

```sh
cd codeswitch-workbench
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm demo
pnpm dev
```

Open `http://127.0.0.1:5173` (or the port printed by Vite). For a production bundle, run `pnpm build` then `pnpm preview`. Both servers bind to loopback by default.

Dependency installation needs registry access. After installation, these commands operate locally. Edit `examples/sample-input.txt` to try another supported input. CLI validation failure or file-read failure exits nonzero; unresolved content is reported for review and is not itself a schema failure.

## Example input/output

```text
明天早上九點 review payment webhook，先 check sandbox credentials, but don't deploy to production yet. 然後 draft an English follow-up email to Vincent。
```

The CLI prints complete JSON, including these three cards:

| Type | Title | Additional fields |
| --- | --- | --- |
| calendar | Review payment webhook | time: Tomorrow, 9:00 AM |
| task | Check sandbox credentials | action: check |
| email_draft | Prepare English follow-up email to Vincent | recipientName: Vincent; recipientEmail: null; language: English; body: null |

All have `status: draft` and `requiresConfirmation: true`. A separate constraint has `action: deploy`, `scope: production`, `polarity: prohibited`, with evidence `don't deploy to production yet`. There is no deployment card. Missing values use JSON `null`, not invented values. Every evidence records text plus start/end UTF-16 indices.

```text
Work cards: 3; Constraints: 1; Validation: PASS
```

## Current limitations

This is a narrow rule baseline, not completed multilingual AI. Only the documented verbs, targets, date phrases and clause forms are recognized. Unknown requests and unsupported negations remain unresolved. Shared grammar defects can affect both extraction and validation, so explicit expected fixtures and adversarial tests complement validation. Quotation, conditionals, arbitrary names/addresses, arbitrary dates and general natural language are unsupported. No email body is generated: users must write it themselves. P0 validation intentionally accepts parser drafts only; P1 validates the immutable baseline separately from reviewed cards. Speech, models and hardware integration remain unimplemented.

## Roadmap

See [ROADMAP](docs/ROADMAP.md) for P0 through P5. P1 remains the product UI baseline; the current evaluation delivery stops at P2A.

## Development and data

See [test report](docs/TEST_REPORT.md), [data policy](docs/DATA_POLICY.md) and [dependency licenses](docs/DEPENDENCIES.md). Fixtures are original task-specific sentences; the required acceptance sentence and counterexamples come from the project brief. Source licensing remains reserved for the owner. No project license is granted by this repository; dependency licenses remain separate.

## References

The project brief defines the product requirements and hardware target. Local `package.json` and `pnpm-lock.yaml` define the actual tools and versions; installed package metadata supplies dependency license declarations. No external dataset, model or hardware documentation was used to claim tested capabilities.

## P1 browser workflow

1. Open the local UI. The example is prefilled; click **Analyze Text** to create three cards and the production deployment prohibition.
2. Expand **Original evidence** on a card to see its exact source highlighted, with UTF-16 start/end indices. Evidence never changes when editing.
3. Click **Edit**. Changes appear as `user-edited` with before/after history. Adjacent keystrokes in the same field form one history entry. Titles must match the structured action/target, or the supported email draft title. The editor shows a suggested title. Unknown instructions cannot be confirmed.
4. Try changing the task title to `Deploy to production`: confirmation is blocked even if its structured action is still `check`. Changing both action and target to deploy/production is also blocked. Restore `Check sandbox credentials` and the original structured fields.
5. Click **Confirm** on the task. Only that card becomes confirmed. Editing it again immediately returns it to draft. **Reject** retains source/history but excludes the card from export; editing a rejected card returns it to draft for review.
6. The email address and body start as unknown. To review the email, supply your own address and body (for a synthetic demo use `vincent@example.test` and `Please review the webhook notes.`), then click Confirm. Name, language, address and body are required; nothing is sent.
7. Calendar time must be the supported explicit relative time or a valid user-entered `YYYY-MM-DDTHH:mm`. Partial dates block confirmation. Relative times stay relative; local date-time strings carry no inferred timezone.
8. Refresh to restore the saved workspace. Click **Export confirmed JSON** to download only confirmed cards. Draft/rejected cards are excluded. Open the file to inspect `originalInput`, `constraints`, each card's `current`, `history`, `revision`, `confirmedRevision`, and `executed: false`.
9. **Clear** changes only the input buffer. **Load Example** replaces that buffer. Reanalysis always asks before replacing an existing workspace. **Clear Local Data** requires a separate confirmation and removes this app's saved workspace.

This sequence is the reproducible UI acceptance walkthrough. Automated Chromium tests exercise desktop (1280×900) and mobile (390×844) layouts, actual downloads, keyboard activation, refresh, recovery and injection handling. They produce ignored screenshots under `test-results/`.

## P1 state, persistence and export

Workspace v1 is saved under `codeswitch-workbench.workspace.v1` in browser localStorage. It contains immutable original input and P0 extraction, current card states, edit/review history and revision-bound confirmations. The input buffer before analysis is not persisted. Data stays on this browser/origin; no analytics, sync or remote text API is included. Do not enter API keys, credentials or other secrets. LocalStorage is unencrypted and accessible to other scripts on the same origin. Use a dedicated local origin.

Loading reconstructs the parser baseline and replays history before accepting stored data. Corrupt or incompatible data is left untouched and the UI offers explicit clearing. Save failures are reported; the current in-memory workspace remains usable but is not claimed to be saved. History is limited to 2,000 entries per card; input to 10,000 UTF-16 code units; each edited value to 5,000; serialized storage to 2,000,000 code units. Multiple tabs are not synchronized; the last successful save wins.

Export schema v1 (`kind: confirmed-workcards`) carries original input, immutable constraints and only confirmed card states with their provenance/history. `validateExport` in `src/web/state/workspace.ts` revalidates the document against its source and replayed decisions. Export is a reviewed local artifact, never proof of tool execution or authenticated identity. Original input may mention excluded cards; this is retained as provenance. No draft/rejected card objects are included. Unknown source segments, unsupported required-constraint verification and failed source validation block confirmation/export. Missing fields on excluded draft cards do not prevent exporting a different valid confirmed card.

Edits use a separate closed-operation validator; arbitrary natural-language contradiction detection is not supported. Confirmation attests review of a local draft, not authorization to send or deploy. History validation detects inconsistent data, but is not a cryptographic audit: anyone controlling localStorage could rewrite a coherent entire workspace. Export import UI, multi-tab conflict resolution, encrypted storage, ICS and Markdown are not implemented. No service worker is installed: use the local server to reload the app; once loaded, its workflow needs no external network API.

## Browser checks

```sh
pnpm build
# If Chromium is not already installed in the development environment:
pnpm exec playwright install chromium
pnpm test:browser
```

The local verification reused an existing Chromium cache; no browser download was needed. CI is configured to install Chromium and run the browser tests after build. CI has not been run on GitHub for this branch. A bundled Noto Sans TC font supplies Chinese glyphs locally without contacting a font CDN; its third-party license is recorded separately.

## P2A: local LLM evaluation (separate from the UI)

P2A adds a Node-only Ollama structured extraction adapter, independent proposal verification, an original 60-example text benchmark and reproducible JSON/Markdown reports. The P1 browser workflow continues to use the deterministic engine. There is no speech, Hailo, cloud LLM or automatic work execution.

```sh
pnpm benchmark:baseline
# Discovery only; writes NOT_RUN and exits 2 without inference:
pnpm benchmark:llm --probe-only
# Only after a trusted local Ollama service and these models are already installed:
pnpm benchmark:llm --model=qwen2.5:1.5b --model=qwen2.5:7b
# Aggregate recorded results without calling models:
pnpm benchmark:report
```

The CLI never downloads a model. Omit model flags to select at most two already installed eligible models, preferring Qwen and choosing smallest/largest file sizes. It only connects to `http://127.0.0.1:11434`; no arbitrary URL flag exists. Do not expose Ollama publicly. No API key is required. The UI never contacts this endpoint.

Current actual result: Baseline complete success **32/60 (53.33%)**, constraint recall **3/13 (23.08%)**. Actual model comparison is **NOT_RUN** because Ollama was not available. Mock and loopback HTTP tests validate software behavior only. There is no evidence yet that a local LLM is better, so P2B/UI integration is not recommended yet.

Reports are in [reports/comparison.md](reports/comparison.md) and [reports/comparison.json](reports/comparison.json). These contain original synthetic benchmark text and recorded deterministic results; no personal model prompts were uploaded. Check [methodology](docs/EVALUATION_METHODOLOGY.md), [model evaluation](docs/MODEL_EVALUATION.md) and [model provenance](docs/MODEL_PROVENANCE.md) for dataset hash, definitions, failures, candidate references and limitations. Report files are local consistency records, not authenticated audit records; keep raw proposals untrusted. Review future report content/size before committing it.

Gold labels and scoring were fixed before the recorded baseline run. No prompt tuning or live model inference occurred. A future tuning exercise must use a separate development set and new untouched evaluation set. This delivery stops at P2A, not P2B.
