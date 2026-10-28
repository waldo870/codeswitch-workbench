# CodeSwitch Workbench

**One Voice. Multiple Languages. Verified Workflows.**

Project: CodeSwitch Workbench

Competition category: Workplace AI

Hardware status: Awaiting ASUS UGen300 / Hailo-10H

Current status: Deterministic work-card prototype with P3A/P3B offline speech workflow

Hardware integration: Planned with ASUS UGen300 / Hailo-10H; not yet tested on competition hardware

## Product overview

An offline-first multilingual voice-to-workflow assistant for individual professionals who mix Traditional Chinese, English and technical terms. P0 implements deterministic text-to-workcards; P1 adds an editable browser workspace with human review, local persistence and JSON export; P3A/P3B add local offline speech transcription with transcript review before deterministic extraction. The P2 local LLM remains an evaluation-only feature and is not enabled in the product UI.

## Problem statement

One spoken request can contain several tasks, a meeting, an email draft and a prohibition. Turning that request into a single action loses intent and may ignore restrictions. Each supported intent should retain its source and require review.

## Why multilingual voice-to-workflow?

Professionals often describe local context in Chinese while naming tools and technical actions in English. The workflow preserves original audio identity, raw transcription and user corrections, then sends only a confirmed transcript through the existing deterministic parser and validator. Cards remain editable and require individual confirmation before confirmed-only local JSON export. The P0 CLI remains available.

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

The text-to-workcard engine is a narrow deterministic baseline, not completed multilingual AI. Only documented verbs, targets, date phrases and clause forms are recognized. Unknown requests and unsupported negations remain unresolved. Shared grammar limits can affect extraction and validation, so explicit fixtures and adversarial tests complement validation. Quotation, conditionals, arbitrary names/addresses, arbitrary dates and general natural language are unsupported. No email body is generated: users must write it themselves. Offline speech is currently a reviewed prototype using an existing Windows Whisper CPU runtime; one synthetic English fixture passed the reviewed end-to-end flow after explicit punctuation correction. Human, noisy-room and real code-switch speech accuracy, GPU ASR and competition hardware have not been validated. The P2 LLM is not qualified for product use.

## Roadmap

See [ROADMAP](docs/ROADMAP.md) for P0 through P5. P1 remains the editable product UI baseline; P3A/P3B add a reviewed offline speech path. P2 local LLM work remains research-only.

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

P4E stores multiple work sessions and speech review drafts in IndexedDB. Records include a schema version, timestamps, immutable original text/provenance, audio SHA-256 and metadata (never audio bytes), ASR provider/model/runtime and mock/live mode, raw transcript, user corrections, cards, constraints and export history. Only the active session view and legacy migration marker remain as small localStorage settings. The input buffer before analysis is not persisted. Data stays on this browser/origin; no analytics, sync or remote text API is included. Do not enter API keys, credentials or other secrets. Browser storage is unencrypted and accessible to scripts on the same origin. Use a dedicated local origin.

Loading reconstructs the parser baseline and replays history before accepting stored data. Corrupt or incompatible data is left untouched and reported. Save failures are reported; the current in-memory workspace remains usable but is not claimed to be saved. History is limited to 2,000 entries per card; input to 10,000 UTF-16 code units; each edited value to 5,000; legacy serialized workspace to 2,000,000 code units; workspace JSON import/export to 4 MB. Multiple tabs are not synchronized; the last successful save wins.

Export schema v1 (`kind: confirmed-workcards`) carries original input, immutable constraints and only confirmed card states with their provenance/history. `validateExport` in `src/web/state/workspace.ts` revalidates the document against its source and replayed decisions. Export is a reviewed local artifact, never proof of tool execution or authenticated identity. Original input may mention excluded cards; this is retained as provenance. No draft/rejected card objects are included. Unknown source segments, unsupported required-constraint verification and failed source validation block confirmation/export. Missing fields on excluded draft cards do not prevent exporting a different valid confirmed card.

Edits use a separate closed-operation validator; arbitrary natural-language contradiction detection is not supported. Confirmation attests review of a local draft, not authorization to send or deploy. Imported JSON is validated, always creates a new session, and all imported confirmations are discarded; user edits/evidence are revalidated before review. History validation detects inconsistent data, but is not a cryptographic audit: browser storage is not encrypted and can be modified by a user or same-origin script. Multi-tab conflict resolution, encrypted storage, ICS and Markdown are not implemented. A production build precaches its same-origin application shell with a versioned service worker. First load and cache installation require the site to be reachable; browser offline simulation is tested, but a cold-start after real network loss on every browser/hosting setup is not claimed. See [P4E storage](docs/P4E_OFFLINE_STORAGE.md) and [P4F acceptance](docs/P4F_OFFLINE_ACCEPTANCE.md).

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

Historical P2A result: Baseline complete success **32/60 (53.33%)**, constraint recall **3/13 (23.08%)**. At that stage actual model comparison was **NOT_RUN** because Ollama was not available. Later Gemma measurements are recorded below. Mock and loopback HTTP tests validate software behavior only. There is no evidence yet that a local LLM is better, so P2B/UI integration is not recommended yet.

Reports are in [reports/comparison.md](reports/comparison.md) and [reports/comparison.json](reports/comparison.json). These contain original synthetic benchmark text and recorded deterministic results; no personal model prompts were uploaded. Check [methodology](docs/EVALUATION_METHODOLOGY.md), [model evaluation](docs/MODEL_EVALUATION.md) and [model provenance](docs/MODEL_PROVENANCE.md) for dataset hash, definitions, failures, candidate references and limitations. Report files are local consistency records, not authenticated audit records; keep raw proposals untrusted. Review future report content/size before committing it.

Gold labels and scoring were fixed before the recorded baseline run. No prompt tuning or live model inference occurred. A future tuning exercise must use a separate development set and new untouched evaluation set. This delivery stops at P2A, not P2B.

## P2A.1: LM Studio live evaluation

```sh
pnpm benchmark:baseline
pnpm benchmark:llm --provider=lmstudio --probe-only
# Only with an accessible loopback service and a locally available model:
pnpm benchmark:llm --provider=lmstudio --model=advertised-model-id
pnpm benchmark:report
```

LM Studio defaults to `http://127.0.0.1:1234`. The CLI accepts no arbitrary URL and does not install/start a runtime, download a model or alter network bindings. With more than one advertised model, select one explicitly. The fixed eight-case smoke gate precedes the 60-case run; prompt and inference parameters remain fixed. Reports are written to `reports/p2a1-lmstudio.json` and `.md`, with separate smoke/full stages and raw versus verified predictions.

In the original P2A.1 execution environment LM Studio CLI/model inventory was absent and loopback probes were refused. **Live smoke and full benchmark are NOT_RUN**; mock tests are not inference. See MODEL_PROVENANCE.md for the minimum same-environment owner setup. The P2A.1 scorer audit fixes time aliases leaking into target/name comparison without changing the dataset hash. Constraint recall 3/13 and review/blocking 28/28 have different denominators and meanings; neither establishes model superiority. P1 UI remains deterministic. That paragraph describes the historical P2A.1 delivery; current P2.5 findings are recorded below.

## P2A.4 adapter hotfix revalidation

The LM Studio adapter now accepts absent/null/empty tool_calls while rejecting actual calls, invalid types, refusals, truncation and identity mismatch. Failure diagnostics retain HTTP status, stage/code and a bounded redacted preview; no failed response becomes a WorkCard.

```sh
pnpm smoke:lmstudio
```

This dedicated command uses the already available gemma-3-4b-it model and exactly the eight fixed smoke cases. It does not download/switch models or run the 60-case benchmark. Provider, Schema, Evidence, Constraints, Semantics and Full results are separate; any full-case failure yields exit 2. JSON alone, missing prohibitions, nonexistent evidence and blanket unresolved do not count as full success.

Read reports/p2a4-smoke.md for this delivery's actual results. Raw diagnostic text stays in the Git-ignored reports/local-diagnostics directory after bounded redaction. Never enter API keys or secrets. Do not commit local raw diagnostics. All existing prompts, schema requirements, gold labels, dataset bytes and P1 UI behavior remain unchanged.

### P2.5 bounded research mode

```sh
pnpm benchmark:research --model=gemma-3-12b-it
```

This separate research command requires an already available local LM Studio model. It continues after individual extraction failures, checkpoints actual results, and never admits outputs into the UI. Limits: 60 seconds/case, 65 minutes/run, no retries, fixed 60-case dataset and unchanged prompt. Default `benchmark:llm --provider=lmstudio` remains strict. Provider failures/timeouts are reported separately from conditional semantic accuracy. A completed attempt is not necessarily a completed inference. See `docs/EVALUATION_METHODOLOGY.md` for denominators and product qualification.

### Current P2.5 result and P2.6 decision

Real Gemma 3 12B IT Q8_0 CPU research attempted all 60 fixed cases: **18 valid completed outputs,42 timeouts**. This is not a fully completed 60-inference benchmark. Conditional complete gold outcomes: raw2/18, verified3/18; all successes are appropriate handling of unknown inputs, not successful work-card extraction. Raw constraints1/10 assessable tuples; the remaining3/13 gold tuples were on timed-out inputs. No evidence supports enabling Local LLM in the UI. Deterministic remains the only product mode; P2.6 failed qualification. No GPU, speech or Hailo completion is claimed.

```sh
# Re-render an existing report without inference:
pnpm benchmark:research:report p25-gemma-3-12b-it
```

See [the research report](reports/p25-gemma-3-12b-it.md) and [model decision / scorer caveats](docs/MODEL_EVALUATION.md). Research exit0 means all requests were attempted, not that model quality passed. The earlier NOT_RUN paragraphs are historical. No 60-case Gemma4B comparison was performed; its prior fixed Full Smoke was0/8.

### P2 finalization

**P2_ENGINEERING_COMPLETE_WITH_LIMITATIONS**. Local LLM product qualification remains NOT_QUALIFIED; the UI stays deterministic. The final readonly W7900 runtime check is blocked by Vulkan hardware-survey failure and existing HIP invalid-code-object0x1010 model evidence. GPU benchmark NOT_RUN; ROCm7.2 upgrade is not authorized. No driver/runtime/model installation occurred. See [P2 final report](docs/P2_FINAL_REPORT.md) for backup verification, actual CPU metrics, GPU evidence and remaining work. The feature branch is the development checkpoint; local main is initialization only and is not a P2 application release.

### Windows LM Studio from WSL (explicit Node-only opt-in)

Use an owner-started Windows server and an already loaded model. The configured IPv4 must equal the current WSL NAT default gateway; arbitrary hosts/URLs, credentials, paths, ports, redirects and non-WSL use are rejected. The normal adapter remains loopback-only unless this explicit option is provided. No browser/provider connection or bridge is added.

```sh
# Read the current gateway; the application independently rechecks /proc/net/route.
ip route show default
# Set HOST to that Windows WSL NAT gateway (host only, no URL).
export CODESWITCH_WINDOWS_WSL_HOST="<current-WSL-NAT-gateway>"
pnpm smoke:windows --model=gemma-3-27b-it
# Research is allowed after failed strict smoke; it grants no product qualification.
pnpm benchmark:research --model=gemma-3-27b-it
pnpm benchmark:research:report p2-windows-gemma-3-27b-it
unset CODESWITCH_WINDOWS_WSL_HOST
```

`smoke:windows` exits2 unless all eight existing Full Smoke checks pass. Research uses the unchanged fixed prompt/schema/gold, with60s/case and65min total, and records actual failures. Windows artifacts have separate filenames and do not overwrite CPU or WSL failure evidence. The earlier strict `benchmark:llm` command retains its loopback default; use the explicit Windows smoke command for this route. Model availability, quantization and GPU participation must be measured separately. No Firewall, binding, driver, ROCm or model download is performed.


Windows recovery actual result: **GPU participation verified;60/60 valid completions,0 timeouts** using Gemma3 27B Q8_0. Full Smoke3/8, raw complete20/60, verified16/60, constraints4/13. P2 remains engineering complete with limitations; Local LLM UI is not qualified/enabled. This differs from the historical CPU12B model, so it is not a pure GPU speedup experiment. See [Windows recovery report](reports/p2-windows-recovery.md) for GPU proof, all metric denominators and safety/measurement limitations.

## P3: offline speech import and transcript review

The browser can import WAV, run an explicitly configured existing Windows Whisper worker, preserve the raw transcript, review/correct it and confirm it before deterministic extraction. Cards still require their own confirmation. The P2 LLM remains disabled in the product. LM Studio0.4.26's public audio transcription endpoint was tested and is unsupported; an existing Windows Python Whisper installation is used instead. No package/model/driver is installed by the application.

Supported audio: PCM WAV,16000 Hz,mono,16-bit,4 MB/120s maximum. Other formats/remote URLs are refused. Browser audio stays in memory; the worker briefly uses a private ignored request WAV and cleans it up. Workspace audio SHA/metadata and transcript/corrections are stored in IndexedDB; audio bytes are never persisted. Reload requires reimporting audio for another transcription; saved review/work cards remain available.

```sh
pnpm install --frozen-lockfile
# Replace these with EXISTING owner-managed paths, never a model name/URL:
export CODESWITCH_ASR_PYTHON='/mnt/c/Users/<you>/AppData/Local/Programs/Python/Python310/python.exe'
export CODESWITCH_ASR_MODEL_FILE='C:\Users\<you>\.cache\whisper\large-v3.pt'
pnpm dev
```

Open the loopback URL Vite prints. Choose Import Audio → Transcribe → inspect Original ASR transcript → Edit Transcript if needed → Confirm Transcript → Analyze Confirmed Transcript → review evidence/constraints → confirm/reject cards → Export confirmed JSON. Reanalysis asks before replacing existing work. Editing a transcript invalidates its confirmation; previously analyzed cards retain their earlier immutable source until explicitly replaced. Raw ASR without punctuation may remain unresolved: correct it explicitly; the parser does not guess sentence boundaries.

Without valid existing ASR configuration, Transcribe is unavailable and the text workflow remains usable. The Node bridge accepts only same-origin loopback audio requests; it exposes no arbitrary URL, model selector or command. A300s worker timeout and cancellation path are enforced. Do not enter secrets; exports include raw and corrected transcripts.

To reproduce the original synthetic spoken Live Smoke, use the already installed Microsoft David Desktop voice with `tests/live/generate-speech.ps1`, writing `.speech-local/p3-smoke.wav`; no WAV is tracked. Configure the existing runtime above, run `pnpm build`, then `CODESWITCH_LIVE_ASR=1 pnpm speech:live`. Live tests are opt-in and are marked skipped/NOT_RUN in ordinary CI, never counted as mock ASR success. See [speech architecture](docs/P3_SPEECH_ARCHITECTURE.md), [runtime provenance](docs/P3_RUNTIME_PROVENANCE.md) and [test report](docs/P3_TEST_REPORT.md). This is reviewed speech workflow support, not evidence of reliable raw mixed-language recognition, GPU ASR or Hailo integration.

## P4 Prep: Hailo-10H readiness

The codebase now has a provider-neutral ASR registry, a bounded TypeScript/Python Hailo worker JSON contract, an explicit Python Mock worker, and a cross-provider benchmark/report contract. Mock responses are marked `mock` and cannot be counted as Live evaluation. The worker accepts only bounded canonical WAV bytes and a source SHA-256; no arbitrary path, URL or automatic HEF download is accepted. Real HailoRT inference is not implemented.

No ASUS UGen300/Hailo-10H device, HailoRT SDK, HEF, or hardware benchmark was used. Whisper Base/Tiny support is documented from the current Hailo Apps examples, not verified on our target board; no Chinese accuracy or latency is claimed. See [P4 Hailo readiness and Stage II checklist](docs/P4_HAILO_READINESS.md). Do not install SDK/HEF resources as part of this prototype without a separately approved hardware setup.

P4A–P4D are engineering prepared. P4E adds browser-local multi-session IndexedDB persistence, import/export and legacy localStorage v1 migration. P4F acceptance covers simulated internet loss, local worker unavailability and absence of Hailo; this is not a real network-disconnection test. Windows Whisper and LM Studio remain owner-managed local runtimes and are not required for text-only use. Hailo-10H Live and P3C real bilingual speech remain NOT_RUN. See [P4E storage policy](docs/P4E_OFFLINE_STORAGE.md), [P4F offline acceptance](docs/P4F_OFFLINE_ACCEPTANCE.md) and [test report](docs/TEST_REPORT.md).
