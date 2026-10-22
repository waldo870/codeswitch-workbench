# Roadmap

- **P0: Text-to-workcards** — deterministic adapter, contracts, evidence reconciliation, constraints, unresolved content, local CLI, original tests and CI configuration. Completed baseline.
- **P1: Editable Web UI** — React/Vite workspace, source-linked editing, explicit confirmation/rejection, validation after edits, localStorage v1 and confirmed-only JSON export. Completed product baseline.
- **P2A: Local LLM evaluation** — provider-neutral Ollama adapter, original 60-example benchmark, independent validation and reports implemented. Deterministic baseline measured; actual local LLM runs NOT_RUN because no accessible runtime/model was available. Current delivery.
- **P2B: Integration decision** — use measured raw/verified comparisons and human failure review before any UI integration. Not started.
- **P3: Offline speech recognition** — evaluate offline transcription of mixed language speech; measure transcription errors separately from intent extraction. Not started.
- **P4: ASUS UGen300 integration** — investigate ASUS UGen300 / Hailo-10H compatibility, available SDKs, model support and hardware measurements. Planned / Not Tested.
- **P5: End-to-end validation** — test speech through confirmed local exports, constraint preservation, privacy and recovery on target hardware. Not started.

Each phase requires its own scope and acceptance review. P1 does not imply completion of P2–P5. Optional later export formats include ICS and Markdown; neither is implemented.
