# Roadmap

- **P0: Text-to-workcards** — deterministic adapter, contracts, evidence reconciliation, constraints, unresolved content, local CLI, original tests and CI configuration. Completed baseline.
- **P1: Editable Web UI** — React/Vite workspace, source-linked editing, explicit confirmation/rejection, validation after edits and confirmed-only JSON export. Completed product baseline; v1 data migrates from localStorage to IndexedDB in P4E.
- **P2A: Local LLM evaluation** — provider-neutral Ollama adapter, original 60-example benchmark, independent validation and reports implemented. Deterministic baseline measured; initial runtime-unavailable result retained as history; later Gemma 4B smoke ran and failed qualification.
- **P2B: Integration decision** — use measured raw/verified comparisons and human failure review before any UI integration. Not started.
- **P3A/P3B: Offline speech-to-workflow** — completed a WAV import, local Whisper CPU transcription, transcript correction/confirmation and deterministic card review/export path. The live end-to-end evidence is one synthetic English fixture; broad multilingual speech evaluation is not complete.
- **P4 Prep: Hailo readiness** — provider/runtime contracts, bounded JSON worker protocol, explicit Mock-only Python fixture, cross-provider benchmark contract and Stage II deployment checklist implemented. HailoRT, HEFs, hardware, accuracy and latency remain NOT_RUN / Not Tested. Real deployment remains future work after hardware and SDK review.
- **P4E: Offline persistence** — IndexedDB-backed sessions, transcript review, validated import/export, legacy Workspace v1 migration and versioned service-worker app-shell caching implemented. Browser offline simulation is covered; real network-loss cold-start across target hosting/browser setups remains unverified.
- **P4F: Offline acceptance** — simulated Internet-unavailable, ASR worker unavailable, LM Studio unavailable and Hailo unavailable paths are covered. Hailo Live and P3C real bilingual speech remain NOT_RUN. See P4E/P4F acceptance documents.
- **P4G: Feedback to improvement** — local user feedback, deterministic editable proposals, explicit approval/rejection, and manually tracked improvement sessions. Feedback is not a verified defect; `resolved` and user-entered test notes do not imply a passing test or implemented fix. No code, shell, GitHub, email, or external tool is executed.
- **P5: Open speech evaluation** — deterministic sample manifest validation, provenance, language-separated CER/WER, Windows Whisper evaluation runner and P4G draft finding interface prepared. Twenty Owner-provided Common Voice test samples are locally prepared (10 zh-TW scripted, 10 English spontaneous); live benchmark is NOT_RUN because Windows Python/Whisper could not be started from this execution environment. FLEURS does not provide zh-TW Mandarin in the checked revision.
- **P6: Target-hardware end-to-end validation** — test speech through confirmed local exports, constraint preservation, privacy and recovery on Hailo/UGen300 hardware. Not started.

Each phase requires its own scope and acceptance review. P1 does not imply completion of P2–P5. Optional later export formats include ICS and Markdown; neither is implemented.

- **P2A.1: LM Studio runtime adapter** — shared bounded transport/decoder, explicit local model selection and fixed 8-case smoke gate implemented. Scoring audit fixed time aliases outside time slots without changing gold. The original delivery had no runtime; P2A.4 subsequently measured Gemma 4B Full Smoke 0/8. Its 60-case strict benchmark remains NOT_RUN. P2B decision remains deferred.

- **P2.5: Bounded model comparison** — fixed-prompt CPU Gemma 12B research, individual failures and semantic denominators reported separately; strict qualification preserved. See MODEL_EVALUATION.md for actual coverage and results.
- **P2.6: Safe UI integration** — conditional on measured capability, evidence/constraint interception and usable latency. Research cannot turn on the feature or change P1 state. No product qualification follows from schema correctness or software test success.

- **P2 final checkpoint** — engineering complete with limitations; model/product LLM qualification failed and GPU inference blocked. Deterministic UI remains operational. GitHub feature backup authorized and verified. ROCm7.2 upgrade and P3 are not started. See P2_FINAL_REPORT.md.

- **Windows GPU recovery** — owner-started Windows LM Studio route verified with W7900 GPU participation; real27B full60-case research completed without timeouts. Model/product Gate still NOT_QUALIFIED; P1 remains deterministic. P3 and ROCm upgrade not started.

- **P3A/P3B delivered** — original synthetic English audio was transcribed by existing Windows Whisper CPU, explicitly corrected/confirmed and passed deterministic card/constraint/export flow. P3_END_TO_END_PASS is limited to that reviewed fixture. LM Studio ASR public API unsupported in the installed version; no driver/model download or LLM UI enablement. P3C metrics/interfaces prepared; actual multilingual/human/corpus evaluation is future work. Hailo/UGen300 remains planned/not tested.
