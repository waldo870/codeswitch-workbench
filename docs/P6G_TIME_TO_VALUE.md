# P6G Workflow Time-to-Value

P6G provides a fixed protocol and local human-observation instrument for four scenarios: daily checklist, meeting follow-up, shift handover, and software release review. Each scenario compares manual card creation, a routine template, and encrypted collaboration with a reviewed reply.

## Human procedure

Use a real participant and a facilitator. For each scenario/method pair, present the fixed scenario brief and the method-specific completion boundary in `src/evaluation/p6g-evaluation.ts`. Manual and template methods end after the scenario's stated card review. Encrypted collaboration includes a complete request/import/reply/merge round trip in a second local browser profile. Start timing when the participant receives the brief and the facilitator clicks **Start participant workflow**. Stop when that same method-specific boundary is reached and the facilitator clicks **Finish timing**. Duration is captured with the browser's monotonic performance clock while wall-clock start/end timestamps are retained for provenance. Then enter facilitator-observed counts for operations, corrections, valid work cards, missed constraints, handoff conflicts, and confirmations, plus whether the boundary was reached. Do not include setup/training in one method unless it is included in every comparison method; record the same preparation policy for all methods outside this form.

The instrument records observation time, not a claim that the observations were independently audited. Do not enter real names; the optional participant code should be pseudonymous. Records are stored in IndexedDB under the active Workspace, can be deleted after confirmation, and can be explicitly exported as JSON. Nothing is uploaded. No audio is collected by this study form.

## Metrics

Durations are whole-workflow elapsed milliseconds with P50/P95; operations and corrections are means per observation; valid cards are summed as valid/expected; missed constraints are missed/expected; conflicts are summed; confirmations are averaged; completed workflows are completed/observations. A missing denominator is shown as `0` with a zero denominator, while unavailable timing and means are `null` / `NOT_RUN`. Expected card and constraint denominators are locked to the versioned scenario. Automated test durations are never human evidence. Invalid, duplicate, impossible, unknown-scenario, altered-protocol, denominator-tampered, or non-human evidence records are rejected.

Run `pnpm benchmark:p6g` to create a report with no observations (initially `HUMAN_EVALUATION_NOT_RUN`). To evaluate reviewed observations exported from the UI, run `pnpm benchmark:p6g -- --observations=/path/to/codeswitch-p6g-human-observations.json`. Input must match the fixed schema-v1 protocol. The command writes `reports/p6g-evaluation.json` and `.md` and never calls an ASR, translation, LLM, network, or external work provider.

## Acceptance status

There are no participant observations in the initial report. Human evaluation remains `HUMAN_EVALUATION_NOT_RUN`; the interface and report generator are engineering artifacts only. Browser offline tests simulate an offline browser context after Service Worker caching; this is not a physical disconnect or two-device study. Existing P6A cryptographic exchange tests cover round-trip and authenticated tamper rejection; routine metadata is covered by the new encrypted payload tests. Hailo-10H live inference and P3C real code-switch speech remain not run.
