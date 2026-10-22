# CodeSwitch Workbench

**One Voice. Multiple Languages. Verified Workflows.**

- Project: CodeSwitch Workbench
- Competition category: Workplace AI
- Target hardware: ASUS UGen300 / Hailo-10H
- Current status: Text-only deterministic prototype
- Hardware integration: Planned / Not Tested
- No affiliation with or dependency on AgentMorph

## Product overview

An offline-first multilingual voice-to-workflow assistant concept for individual professionals who mix Traditional Chinese, English and technical terms. P0 implements a runnable text-to-workcards core. It does not perform AI inference or speech recognition.

## Problem statement

One spoken request can contain several tasks, a meeting, an email draft and a prohibition. Turning that request into a single action loses intent and may ignore restrictions. Each supported intent should retain its source and require review.

## Why multilingual voice-to-workflow?

Professionals often describe local context in Chinese while naming tools and technical actions in English. The intended product preserves that language switching through transcription, intent extraction, verification, editable cards, confirmation and local export. Voice, editing, confirmation and export workflows are future phases; the present CLI prints local JSON only.

## Feature scope

P0 provides task, calendar and email_draft contracts, a deterministic extraction adapter, required/prohibited constraints, source evidence, unresolved clauses, independent validation and a CLI. No API keys, network inference, accounts, external tools or hardware are needed at runtime. Every produced card is a draft requiring confirmation; no execution API exists.

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
```

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

This is a narrow rule baseline, not completed multilingual AI. Only the documented verbs, targets, date phrases and clause forms are recognized. Unknown requests and unsupported negations remain unresolved. Shared grammar defects can affect both extraction and validation, so explicit expected fixtures and adversarial tests complement validation. Quotation, conditionals, arbitrary names/addresses, arbitrary dates and general natural language are unsupported. No email body is generated. No confirmation state transition, local artifact export command, UI, speech model or hardware inference is implemented. P0 validation intentionally accepts draft status only, although the contract reserves confirmed/rejected for future workflows.

## Roadmap

See [ROADMAP](docs/ROADMAP.md) for P0 through P5. This delivery stops at P0.

## Development and data

See [test report](docs/TEST_REPORT.md), [data policy](docs/DATA_POLICY.md) and [dependency licenses](docs/DEPENDENCIES.md). Fixtures are original task-specific sentences; the required acceptance sentence and counterexamples come from the project brief. Source licensing remains reserved for the owner. No project license is granted by this repository; dependency licenses remain separate.

## References

The project brief defines the product requirements and hardware target. Local `package.json` and `pnpm-lock.yaml` define the actual tools and versions; installed package metadata supplies dependency license declarations. No external dataset, model or hardware documentation was used to claim tested capabilities.
