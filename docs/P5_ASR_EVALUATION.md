# P5 Small ASR Evaluation

## Current status

**Live benchmark: NOT_RUN.** The Owner-provided Common Voice archives were found and the selected audio was prepared locally, but Windows Whisper did not run in this execution environment. The `large-v3.pt` checkpoint and Windows Python executable are present; the worker variables were not configured, and direct Windows-Python startup reported a WSL interop socket failure. No ASR inference was completed. FLEURS was reviewed as an alternative, but its current dataset revision has no Traditional Chinese Mandarin (`zh-TW`) config; substituting Mandarin-China or Cantonese would change the target cohort. See [open-source research and source/license register](P5_OPEN_SOURCE_RESEARCH.md).

## Prepared Common Voice cohorts

- `cv-corpus-27.0-2026-09-11`, Chinese (Taiwan) `zh-TW`, official `test.tsv` split, reference column `sentence`, 10 samples.
- `sps-corpus-5.0-2026-09-11-en`, English spontaneous speech, official `test` split, reference column `transcription`, 10 samples.
- Both supplied README files state CC0-1.0 / CC-0. The local sample files and manifest remain under the ignored `local-only/p5-speech/` directory. No corpus files, raw audio, transcripts, or demographic fields are tracked by Git.
- Selection ranks eligible source IDs by SHA-256 of `codeswitch-p5-small-2026-01:<sourceId>`, then takes the first 10 with valid, present source audio. No transcript was changed. The manifest records source IDs, source and prepared audio hashes, release revision, split and attribution.
- All 20 prepared WAV files passed local path containment, source/prepared SHA-256 comparison, WAV format inspection, 16 kHz mono PCM16 checks, and the existing 4,000,000-byte / 120-second limits. Nothing was truncated.

The existing Windows Whisper worker variables (`CODESWITCH_ASR_PYTHON` and `CODESWITCH_ASR_MODEL_FILE`) are absent. The existing Windows Python 3.10 executable, `large-v3.pt` checkpoint, `ffmpeg`, and `wslpath` are present. A direct attempt to start the Windows Python executable reported `WSL (9 - ) ERROR: UtilBindVsockAnyPort:309: socket failed 1`; the process did not reach Whisper import or inference. No Linux GPU runtime, model, or corpus was installed/downloaded.

## Local sample layout

After Owner completes official dataset access and chooses the exact release, place only the 20 approved local samples under ignored `local-only/p5-speech/`:

```text
local-only/p5-speech/
  manifest.json
  original/<source-id>.<source-format>
  prepared/<source-id>.wav
```

The manifest schema is defined by `src/speech/p5-evaluation.ts`; the current local manifest contains exactly 10 `zh-TW` and 10 `en` records from their respective official test splits. Each record has source dataset/version/revision, locale, split, original source ID, license/attribution, original file SHA-256, prepared canonical WAV path and SHA-256, and unmodified reference transcript. The canonical worker WAV passes the existing 16 kHz mono PCM16 validation and size/duration limits. The supplied MP3 files were converted using the already-installed FFmpeg; both hashes are recorded. Never commit `local-only/p5-speech`.

The default sample selection seed is `codeswitch-p5-small-2026-01`. `deterministicSampleSelection()` sorts stable source IDs by SHA-256 of `seed:sourceId`; record the chosen source IDs in the local manifest and do not reshuffle after inspecting ASR output. The manifest SHA in the report identifies the local manifest; each audio SHA identifies the exact prepared WAV used for inference. The report intentionally omits transcripts and audio.

## Run

After resolving the WSL-to-Windows Python launch issue, configure the existing Windows worker using its owner-managed local settings, without printing their values into logs:

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

## Live results review (2026-10-29)

The existing live result was reviewed without rerunning ASR. Windows Whisper large-v3 CPU completed all 20 samples: zh-TW CER **12/77 = 15.58%** and English WER **75/430 = 17.44%**. These metrics are per-language and are not combined. The samples are separate zh-TW scripted read speech and English spontaneous speech; this is **not** a Chinese-English code-switch test, workplace-command evaluation, negation-preservation test, or Hailo result.

| Cohort | Samples | Audio duration total / median / range | Model-load P50/P95 | Inference P50/P95 | Total provider latency P50/P95 | Inference RTF P50/P95 | End-to-end RTF P50/P95 |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| zh-TW scripted | 10 | 38.964 s / 3.816 s / 2.520–5.076 s | 9.15 / 9.91 s | 13.69 / 74.17 s | 26.94 / 96.88 s | 3.73 / 29.43 | 7.26 / 38.44 |
| English spontaneous | 10 | 178.956 s / 4.968 s / 2.052–70.992 s | 8.95 / 9.24 s | 13.55 / 130.65 s | 26.01 / 142.65 s | 2.55 / 6.47 | 5.07 / 12.67 |

Durations were read from the prepared PCM WAV headers. Inference RTF is transcription duration divided by audio duration; end-to-end RTF uses total provider latency divided by audio duration. P50/P95 use the report's nearest-rank percentile convention; with 10 samples, P95 is the maximum. Model loading, transcription and total provider latency are separate quantities: total latency includes process/validation overhead and model loading, and should not be added to the separately reported timings.

The per-sample highest normalized error rates were `en-test-01` 2/1 words (200%; a one-word denominator makes this rate unstable), `zh-tw-test-01` 5/4 characters (125%), `zh-tw-test-02` 4/10 characters (40%), `zh-tw-test-09` 2/7 characters (28.57%), and `en-test-03` 61/217 words (28.11%). The reports contain these opaque sample IDs and counts only, not the transcript text.

There are **16 case-level P4G draft candidates**, all `verifiedDefect=false`, still requiring human review, with none approved or integrated. Their overlapping heuristic tags count: missing words 8, punctuation 6, performance 7, incorrect technical terms 4, unsupported transcript 2; negation and language-switching tags 0. These are classifier labels, not independent findings. In particular, the current technical-term classifier treats changed ASCII tokens broadly; the four tags do not establish technical terminology errors. No candidate was converted into a P4G product feedback record.

`Dataset SHA-256: NOT_AVAILABLE` means a hash of either full source corpus/archive was not computed. The report retains the exact selected-sample manifest SHA-256 (`sha256:6939e4d0977371bfadd109bee5a04275e03c0d8ecbc6fb37e86ce26eb2294b11`), and the ignored local manifest contains original and prepared audio hashes. These do not stand in for a full dataset hash. The JSON report omits transcript text; audio and manifest remain under the ignored local directory. No P3C real code-switch speech or Hailo live result is claimed.
