# P7B Dual Edge ASR Research

**Status: contract and deterministic mocks only. Live ASR: NOT_RUN.** No Hailo SDK/runtime or NeMo-Speech.cpp was installed; no model/HEF was downloaded and no GPU configuration changed.

## Design

The proposed review path runs two independent providers against the same immutable audio identity:

```text
Audio + SHA-256
  ├─ Hailo Whisper worker ── partials / final / provenance
  └─ Nemotron 3.5 ASR ───── partials / final / provenance
                   ↓
        Dual review coordinator
        ├─ retain each raw provider result
        ├─ compare negation / numbers / dates / prerequisites
        └─ require human transcript choice
                   ↓
        existing P3 transcript review → existing parser/validator
```

The new `src/contracts/dual-edge-asr.ts` is a research contract; it does not replace `SpeechProvider`, register a provider in the UI, or alter the P1 validator. Existing ASR `SpeechProvider` results remain the final-result boundary. Future stream adapters can map provider events to the added `partial`, `final`, or `error` update format and retain the legacy provider/model/runtime provenance.

## Modes and state

- `hailo_only`: only Hailo updates are admissible.
- `nemotron_only`: only Nemotron updates are admissible.
- `dual_review`: both providers must produce final results before comparison is complete.

Every event includes provider/model ID, execution mode (`mock` or `live`), original audio SHA-256, monotonic sequence, stage, transcript, optional language/timed segments, runtime/device metadata, and elapsed-clock metadata. A `partial` is held separately from a provider `final`. A timeout, cancellation, or provider error is represented as an error event, never a transcript. Provider identity/model/mode cannot switch midway through one session; events with a different audio hash, duplicate final, or out-of-order sequence are rejected.

When both finals differ, both raw texts remain stored. The coordinator highlights detectable differences involving negation, numbers, relative dates/deadlines, and prerequisite words. This lexical comparison is a review cue, not semantic proof and not a general contradiction detector. Every final remains `review_required`; only an explicit human choice of a provider final creates `reviewedTranscript`. No provider confirmation state is accepted. Work-card analysis eligibility remains false until every selected provider has a final and a human has selected the transcript.

The current Hailo `SpeechProvider` adapter reports a final result only; it does not implement partial streaming. A Hailo worker change will be needed before partial events can be populated from Hailo. The contract supports this future work without making the existing Hailo mock appear live.

## Comparison/evaluation plan

Use the existing P5 `SpeechBenchmarkCase` and `createSpeechBenchmarkReport` path and the same versioned audio IDs, source SHA-256s, normalization rules, and references for:

1. Windows Whisper large-v3 baseline.
2. Nemotron 3.5 ASR Streaming 0.6B.
3. Hailo Whisper Base/Tiny.
4. Dual-review product path, scored only after human review.

Report zh-TW and English separately; neither cohort is a code-switch test. Add consented original P3C mixed zh-TW/English workplace speech for term accuracy, negation and prerequisite preservation. Metrics: CER/WER, code-switch term accuracy, negation retention, raw and reviewed work-card complete success, time to first partial, inter-partial latency, finalization latency, RTF, CPU/Hailo utilization, and power if a calibrated meter is available. Record model load separately from inference and stream timing. No number should be populated from Mock events.

## Safety boundary

Provider disagreement never resolves itself by choosing a “better” model. Partial text cannot become cards. Even after a human selects a final transcript, the existing transcript confirmation, Work Card validation, constraint checks, and per-card confirmation are required. No external work is executed. A synthetic Hailo output remains tagged `mock`; only a worker reporting actual Hailo device and live execution can count as a Hailo result.

## Verification

Contract tests cover all three modes, partial/final lifecycle, provider/audio provenance, ordering, timeout/cancellation, disagreement flags, explicit human selection, and Mock provenance. The Mock is a fixture generator only.

Current gates: TypeScript typecheck PASS; Vitest 422/422 PASS (6 dual-ASR tests added); production build PASS; CLI demo PASS; browser suite 42 PASS and 4 existing live-ASR tests SKIPPED; `git diff --check` PASS. The four skipped tests are not counted as passes. Nemotron and Hailo live inference remain NOT_RUN.

## Official references

- [NVIDIA NeMo-Speech.cpp runtime](https://github.com/NVIDIA/NeMo-Speech.cpp)
- [NVIDIA NeMo-Speech.cpp serving and realtime WebSocket](https://github.com/NVIDIA/NeMo-Speech.cpp/blob/main/docs/server.md)
- [NVIDIA NeMo-Speech.cpp HTTP/WebSocket API](https://github.com/NVIDIA/NeMo-Speech.cpp/blob/main/docs/api.md)
- [NVIDIA Nemotron 3.5 ASR Streaming 0.6B model card](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b)
- [Hailo standalone speech recognition documentation](https://github.com/hailo-ai/hailo-apps/tree/main/hailo_apps/python/standalone_apps/speech_recognition)
- [Hailo Whisper conversion/evaluation repository](https://github.com/hailocs/hailo-whisper)
