# P3 offline speech-to-workflow architecture

P3 adds an audio intake/review path to the existing deterministic product. It does not enable the P2 LLM in the UI. The current ASR backend is an explicitly configured, already installed Windows Whisper Python worker running on CPU. LM Studio's public transcription API was tested and is unsupported in installed version0.4.26. No ASR/model/driver/runtime package is downloaded or installed by this application.

## Data flow and trust boundary

Browser file → strict WAV validation and content SHA-256 → same-origin Node speech bridge → private temporary WAV → trusted Windows Python worker → raw ASR result → editable transcript → explicit transcript confirmation → existing P0 extraction and validation → P1 editable work cards → individual confirmation/rejection → confirmed-only JSON download.

`src/contracts/speech.ts` distinguishes audio identity, raw recognition, transcript review and immutable work-card provenance. `AudioSource` stores content hash, display name, byte count, PCM format and measured duration, never audio bytes. `SpeechResult` records sourceAudioId, transcript, detected language, configured local modelId, provider, audio duration, wall-clock recognition duration, status and errors. Confidence is optional in the general contract but is never generated or accepted for this Windows provider, which supplies no overall confidence. Internal Whisper segment/log-probability outputs are not presented as calibrated confidence or word timestamps.

`SpeechSession` retains original ASR text, current text, replayable before/after correction history, revision and confirmed revision. Editing invalidates transcript confirmation. Only a confirmed snapshot can become `SpeechProvenance`; its origin is raw-asr or corrected-transcript. The existing Workspace v1 gains an optional speech snapshot; old text-only workspaces/exports stay compatible. Restore/export validate speech history and its equality to originalInput before replaying the existing card edits/confirmations. Every Work Card's UTF-16 evidence is sliced against that confirmed analyzed text, including user corrections, never retroactively attached to the uncorrected ASR text. Audio and transcript are linked by SHA-256, not by invented timestamps.

A transcript edit does not rewrite already analyzed/confirmed cards: those retain their immutable earlier source snapshot. Reanalysis explicitly asks to replace the workspace. Pending speech replacement is cancelled if the transcript changes. Reanalyzing unchanged speech-derived text preserves provenance; manually typed new text uses the separate typed-text path. Evidence and original ASR output have no UI editing operation. Stored metadata is consistency information, not a signed/authenticated recording or proof against a local user rewriting all data.

## Browser import and review

WAV only: uncompressed PCM,16000 Hz,mono,16 bits, at most4,000,000 bytes and120 seconds. RIFF size, chunk boundaries/padding, fmt/data presence, duplicate format/data chunks, sample format, data alignment and nonempty duration are validated both before upload and on the bridge. MP3/other codecs/remote URLs are refused; there is no automatic resampling. Existing ffmpeg may be used manually by the owner outside the application to prepare a supported WAV.

Import Audio, Transcribe, Transcript Preview/Edit, Confirm Transcript and Analyze Confirmed Transcript are separate actions. ASR never confirms cards. Unknown speech text becomes unresolved under existing rules; it is not inferred by the LLM. Provider failures, malformed responses, cancellation, unsupported/oversized/corrupt audio and empty transcripts do not replace existing cards. New file selection requires consent if a speech review exists; reanalysis requires consent if any workspace exists. Late/cancelled requests cannot apply stale results. User text and filenames are React text nodes; no HTML injection rendering or shell interpretation is introduced.

## Local bridge and Windows worker

Vite's dev/preview middleware serves `/api/speech/capabilities` and `/api/speech/transcribe`. It binds loopback through existing scripts/config, checks local socket/Host/Origin/Sec-Fetch-Site, sends no CORS permission, and requires audio/wav plus an application request header. It accepts raw bytes only, not URLs, filenames, executable paths, model choices or prompts. Responses are no-store. One ASR request at a time; uploads and outputs are bounded, and deadlines/abort propagate to the worker. The P1 browser calls only its own origin, never Windows LM Studio or arbitrary provider addresses.

Trusted operator environment only:

- `CODESWITCH_ASR_PYTHON`: an existing absolute WSL-mounted Windows python.exe.
- `CODESWITCH_ASR_MODEL_FILE`: an existing absolute Windows .pt checkpoint path.

Neither comes from an utterance, browser field or request. The model must already exist. Whisper receives the absolute existing file path, preventing its model-name downloader. Generated private request directories under ignored `.speech-local/` hold only a fixed audio.wav (0600; parent/request directory private), removed in finally after success/failure/cancel. Browser audio is memory-only; backend audio is temporarily on disk and is not in localStorage, diagnostic logs or Git. Cleanup failure fails the request with a visible message. Interrupted OS/process crashes can leave private request files; no secure-erasure guarantee is made. Owners may inspect this ignored directory after a crash.

The worker path/model/generated audio path are separate spawn arguments with shell=false. User filenames are display metadata only. No command/tool is selected by recognized text. The worker rechecks WAV properties and returns the audio SHA for the adapter to verify. Stderr is consumed without retaining provider content or stack traces; only bounded JSON stdout enters schema validation. Raw audio/text is not printed to diagnostic logs.

A process-local compatibility shim suppresses Numba's optional coverage import because the existing coverage.types.Tracer interface is incompatible. No installed package is changed. Whisper is explicitly device=cpu, fp16=False,8 Torch threads, task=transcribe, no text prompt or gold labels. The worker has a300s hard-exit watchdog. Stdin is closed on launch because keeping it open stalled actual Windows/WSL interop. A request-scoped private cancellation marker is polled by the worker; actual audio uses a private WAV. Earlier EOF/framed streaming revisions are diagnostic history, not the final protocol. Cancellation exits only this worker; fallback termination is scoped to its child process. No Windows LM Studio models are loaded/unloaded.

## Persistence and export

`codeswitch-workbench.speech.v1` holds reviewed speech metadata/text/history, capped at200k serialized characters; no audio/base64 is accepted. Corrupt data is not silently overwritten. Workspace v1 retains its existing2M limit with optional provenance. Storage failures are visible; in-memory state remains usable. Clear Local Data requires confirmation and removes both records; partial removal failures are reported accurately. Audio must be reimported after reload to transcribe again, but saved transcript review can continue.

Confirmed-only export retains audio identity, raw ASR, corrections, transcript confirmation, constraints and original UTF-16 evidence. Draft/rejected/stale cards stay excluded through the existing exporter and validator. Export includes private transcript text and filenames; users should review it before sharing. It creates no calendar/email/external action. The P2 LLM route remains a separate research CLI and is not invoked by this speech flow.

## P3C preparation

`speech/evaluation.ts` accepts separate audio-hash gold cases and actual recognition outcomes. CER uses Levenshtein distance over Unicode code points; WER uses case-sensitive whitespace-separated tokens (not a Chinese word segmenter). Unique supplied code-switch terms are matched case-insensitively with word boundaries; this is term coverage, not a universal code-switch error metric. Zero denominators stay null. Constraint preservation is matched expected tuples versus actual extracted constraints; end-to-end card success must separately include counts/fields/source/confirmation safety. ASR latency includes import/model load and recognition, not human editing time. Raw and corrected-transcript outcomes must be recorded separately.

No Common Voice or other corpus was downloaded. A future licensed, owner-approved audio evaluation must keep original/human gold text separate from ASR input and must not substitute the P2 text benchmark for speech accuracy. Current English synthetic speech proves one reviewed path, not real-user multilingual, accent, noisy-room or GPU ASR quality. Hailo/UGen300 remains planned/not tested.
