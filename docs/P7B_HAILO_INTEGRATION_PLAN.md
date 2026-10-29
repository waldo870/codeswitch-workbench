# P7B Hailo Integration Plan

**Status: preparation only. Hailo hardware and Live ASR: NOT_RUN.** Do not install Hailo SDK, download HEF files, or claim hardware results based on this plan.

## Provider boundaries

Keep the existing `HailoSpeechRecognizer` final-result path and `HAILO_WORKER_PROTOCOL` contract. A later protocol revision may add optional streaming operations/events while remaining backwards-compatible with the current health/transcribe operations. The Hailo provider must report `executionMode: live` only when the hardware health response confirms an actual device and successful inference. `mock-only` continues to be a Mock and `hardware-unavailable` remains a fail-closed result.

Nemotron is a distinct local runtime process and model. Its GGUF, runtime provenance and CPU/Vulkan device metadata must never be labeled Hailo. The coordinator stores provider-specific results under their own provider IDs and joins them only by the same verified audio SHA-256.

## Implementation sequence after hardware access

1. Confirm the exact ASUS UGen300 interface, Hailo-10H device identity, supported host OS, PCIe/M.2/USB path, BIOS/firmware, and vendor-supported HailoRT/DFC versions from the device documentation. Do not infer platform readiness from a Hailo-8 machine.
2. On an authorized isolated development image, install the matching vendor runtime. Use the Hailo Apps supported Whisper Base/Tiny HEF/model resources; record source revision, SHA-256, license and conversion provenance. Do not commit weights/HEFs.
3. Extend Python worker contract with `stream_start`, `audio_chunk`, `stream_finish`, `cancel`, and `health` (or equivalent). Include request/session ID, source audio SHA, monotonic sequence, sample rate, channel/PCM format, provider/model ID, runtime version/device, event stage, optional timestamps/language, and explicit error code.
4. Enforce audio chunk byte/duration limits, 16 kHz mono PCM16 initial path, no arbitrary file path/URL, bounded queue, request timeout and cancellation. Keep raw audio temporary and private; do not log audio or transcript text.
5. Validate every partial and final event against the same audio identity and provider session. Never use partials for cards. Preserve final transcript exactly; no correction or normalization may silently replace provider output.
6. Verify hardware by matching Hailo device enumeration, runtime health, worker device metadata, inference success, and available utilization telemetry. Hailo Mock responses remain separately labeled.
7. Only then run the same paired P5 recordings through Hailo Base/Tiny and Nemotron CPU/Vulkan. Record model load, first partial, finalization, RTF, constraints, device utilization, and power with a calibrated meter.

## Dual review policy

`dual_review` waits for both provider finals or reports a failed/cancelled provider. It preserves partial histories but does not compare them as final answers. If finals disagree on negation, numbers, dates/deadlines or prerequisite markers, display both evidence spans and mark `REVIEW_REQUIRED`. If no category-specific cue is detected but transcript differs, retain a general transcript disagreement. This lexical layer can miss paraphrases and scope differences; reviewers must see both complete raw transcripts.

The human selects one raw final or manually edits a separate reviewed transcript. Keep both provider finals and the chosen review record. Starting a new audio hash or rerunning either provider invalidates reviewed selection. The result enters existing P3 transcript review as a new unconfirmed session. Existing P1 validator and per-card confirmation remain mandatory.

## Stage II acceptance checklist

- Hardware identity/model/runtime provenance captured and independently checked.
- Hailo live path passes WAV import, SHA verification, partial/final sequencing, timeout, cancellation, device-unavailable and malformed-worker cases.
- Nemotron CPU baseline passes; Vulkan is separately verified, not assumed from build availability.
- Same audio sample IDs and hashes are used across providers; Common Voice cohorts remain distinct from consented P3C mixed-language recordings.
- Disagreement tests cover negation flips, numerals/deadlines, prerequisites, missing final, out-of-order chunks, duplicate final, and different audio hashes.
- Partial text never yields cards; disagreement never chooses a winner automatically; import/provider switching resets confirmation.
- Metrics report CER/WER, code-switch terms, negation, workflow success, time to first partial, finalization latency, RTF, utilization and power where measured.

## Rollback

Keep Windows Whisper and deterministic text workflow independent. If Hailo worker/runtime fails, disable only the optional Hailo provider and preserve the source audio SHA/session. If Nemotron is unavailable, retain Hailo-only selection; if either provider fails in dual mode, fail the comparison and allow a human to restart in an explicitly chosen single-provider mode. Never silently fall back to Mock or present stale transcripts as current.

## References

- [Hailo Apps standalone speech recognition](https://github.com/hailo-ai/hailo-apps/tree/main/hailo_apps/python/standalone_apps/speech_recognition)
- [Hailo Whisper conversion/evaluation repository](https://github.com/hailocs/hailo-whisper)
- [CodeSwitch Hailo worker protocol](../src/contracts/hailo-worker.ts)
- [CodeSwitch Hailo recognizer](../src/speech/hailo.ts)
- [CodeSwitch dual ASR contract](../src/contracts/dual-edge-asr.ts)
