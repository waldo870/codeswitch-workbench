# P5 Small ASR Evaluation

## Current status

**Live benchmark: NOT_RUN.** No real audio was downloaded or transcribed in this phase. The first target is Common Voice Scripted Speech 27.0 in `zh-TW` and English, but Mozilla Data Collective requires an email and acceptance of its current access terms. The Owner must perform/authorize that step. FLEURS was reviewed as an alternative, but its current dataset revision has no Traditional Chinese Mandarin (`zh-TW`) config; substituting Mandarin-China or Cantonese would change the target cohort. See [open-source research and source/license register](P5_OPEN_SOURCE_RESEARCH.md).

The existing Windows Whisper worker is not configured in this execution environment (`CODESWITCH_ASR_PYTHON` and `CODESWITCH_ASR_MODEL_FILE` are absent). The existing `ffmpeg` binary and `wslpath` are present, but no model or audio operation was attempted. No Linux GPU runtime, model, or audio was installed/downloaded.

## Local sample layout

After Owner completes official dataset access and chooses the exact release, place only the 20 approved local samples under ignored `local-only/p5-speech/`:

```text
local-only/p5-speech/
  manifest.json
  original/<source-id>.<source-format>
  prepared/<source-id>.wav
```

The manifest schema is defined by `src/speech/p5-evaluation.ts`; include exactly 10 `zh-TW` and 10 `en` records. Each record needs the source dataset/version/revision, locale, split, original source ID, license/attribution, original file SHA-256, prepared canonical WAV path and SHA-256, and reference transcript. The canonical worker WAV must pass the existing 16 kHz mono PCM16 WAV validation and size/duration limits. For MP3 input, use an already-installed approved converter to create the canonical WAV; keep both hashes. Never commit `local-only/p5-speech`.

The default sample selection seed is `codeswitch-p5-small-2026-01`. `deterministicSampleSelection()` sorts stable source IDs by SHA-256 of `seed:sourceId`; record the chosen source IDs in the local manifest and do not reshuffle after inspecting ASR output. The manifest SHA in the report identifies the local manifest; each audio SHA identifies the exact prepared WAV used for inference. The report intentionally omits transcripts and audio.

## Run

Configure the existing Windows worker using its owner-managed local settings, without printing their values into logs:

```bash
export CODESWITCH_ASR_PYTHON='<existing Windows Python path visible through WSL>'
export CODESWITCH_ASR_MODEL_FILE='<existing local Whisper .pt model path>'
pnpm benchmark:speech
```

The CLI uses the existing `WindowsWhisper` provider and fails closed on a missing model, audio path escape, digest mismatch, malformed WAV, provider/model mismatch or ASR error. It never fetches a model. Model-load and transcription durations are emitted separately by the worker; total provider latency remains recorded. Runtime metadata identifies this existing worker as CPU. Do not interpret it as W7900 or Hailo performance.

`pnpm benchmark:speech` writes `reports/p5-asr-results.json` and `.md`. With no manifest or no provider attempts the status stays `NOT_RUN`; a partial run is `PARTIAL_LIVE_RESULTS`. Failed inputs and timeouts are retained as such; they do not become zero-error transcripts.

## Scoring and fixed normalization

- The benchmark is intentionally small and preliminary: at most 10 Chinese-Taiwanese and 10 English examples.
- Text uses Unicode NFC. For `zh-TW` CER, punctuation, symbols and whitespace are removed, then code points are compared. Chinese WER is not emitted because whitespace tokenization would be invalid for this corpus.
- For English WER, text is Unicode NFKC, lowercased, Unicode punctuation/symbols are replaced with spaces, whitespace is collapsed, then whitespace-delimited words are compared.
- CER/WER report edit-count numerator and reference-unit denominator. Empty reference denominators yield `null`, not zero.
- P50/P95 total latency includes actual provider attempts, including failures/timeouts where a duration exists. Model-load and transcribe P50/P95 are separately computed for successful worker responses that provide both timings.
- Results and any findings stay separated by language. Public-set read speech is not evidence of natural workplace or code-switch accuracy.

## P4G improvement review

For a transcript/reference discrepancy, a deterministic classifier can emit a **draft candidate** in the P4G `speech_recognition` category tagged with one or more of: missing words, incorrect technical terms, punctuation, negation, language switching, unsupported transcript, or performance. It includes dataset/sample/hash references, not the speech content. Each draft says the observation is unverified and requires human review. It does not create a Workspace Feedback record, approve a proposal, mark a defect, change code, create a GitHub Issue, or produce a work card. Public dataset utterances are not workplace commands and are never fed into the workflow parser as user instructions.

## Current results

The committed P5 report records 0 local audio files, 0 ASR attempts, null CER/WER/latency, and `NOT_RUN`. This is a truthful access/runtime blocker, not a failed model and not a passing benchmark. No P3C real bilingual workplace speech or Hailo live result is claimed.
