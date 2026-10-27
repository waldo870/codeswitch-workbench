# Roadmap

- **P0: Text-to-workcards** — deterministic adapter, contracts, evidence reconciliation, constraints, unresolved content, local CLI, original tests and CI configuration. Completed baseline.
- **P1: Editable Web UI** — React/Vite workspace, source-linked editing, explicit confirmation/rejection, validation after edits, localStorage v1 and confirmed-only JSON export. Completed product baseline.
- **P2A: Local LLM evaluation** — provider-neutral Ollama adapter, original 60-example benchmark, independent validation and reports implemented. Deterministic baseline measured; initial runtime-unavailable result retained as history; later Gemma 4B smoke ran and failed qualification.
- **P2B: Integration decision** — use measured raw/verified comparisons and human failure review before any UI integration. Not started.
- **P3: Offline speech recognition** — evaluate offline transcription of mixed language speech; measure transcription errors separately from intent extraction. Not started.
- **P4: ASUS UGen300 integration** — investigate ASUS UGen300 / Hailo-10H compatibility, available SDKs, model support and hardware measurements. Planned / Not Tested.
- **P5: End-to-end validation** — test speech through confirmed local exports, constraint preservation, privacy and recovery on target hardware. Not started.

Each phase requires its own scope and acceptance review. P1 does not imply completion of P2–P5. Optional later export formats include ICS and Markdown; neither is implemented.

- **P2A.1: LM Studio runtime adapter** — shared bounded transport/decoder, explicit local model selection and fixed 8-case smoke gate implemented. Scoring audit fixed time aliases outside time slots without changing gold. The original delivery had no runtime; P2A.4 subsequently measured Gemma 4B Full Smoke 0/8. Its 60-case strict benchmark remains NOT_RUN. P2B decision remains deferred.

- **P2.5: Bounded model comparison** — fixed-prompt CPU Gemma 12B research, individual failures and semantic denominators reported separately; strict qualification preserved. See MODEL_EVALUATION.md for actual coverage and results.
- **P2.6: Safe UI integration** — conditional on measured capability, evidence/constraint interception and usable latency. Research cannot turn on the feature or change P1 state. No product qualification follows from schema correctness or software test success.
