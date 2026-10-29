# P5 ASR Evaluation

- Status: **LIVE_RESULTS**
- Generated: 2026-10-29T11:52:47.095Z
- Dataset version: P5 per-language datasets (20 samples)
- Dataset revision: Multiple per-language revisions; see below
- Dataset SHA-256: NOT_AVAILABLE
- Sample manifest SHA-256: sha256:6939e4d0977371bfadd109bee5a04275e03c0d8ecbc6fb37e86ce26eb2294b11
- Sampling seed: codeswitch-p5-small-2026-01
- Provider / model: windows-whisper / large-v3
- Runtime / device: existing Windows Python / OpenAI Whisper CPU Worker / cpu
- Samples: zh-TW 10, English 10, total 20

## Dataset revisions by language

zh-TW: cv-corpus-27.0-2026-09-11 (cv-corpus-27.0-2026-09-11; zh-TW; test)
en: sps-corpus-5.0-2026-09-11-en (sps-corpus-5.0-2026-09-11-en; en; test)

## Results by language

| Language | Complete | Failed | Timeout | Not run | CER | WER | Total latency P50 / P95 | Model load P50 / P95 |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| zh-TW | 10 | 0 | 0 | 0 | 12/77 (15.58%) | — | 26935.53 ms / 96878.91 ms | 9148.49 ms / 9910.02 ms |
| en | 10 | 0 | 0 | 0 | — | 75/430 (17.44%) | 26007.31 ms / 142646.58 ms | 8949.18 ms / 9242.96 ms |

Punctuation is removed under the fixed scoring normalization. zh-TW is scored with Unicode NFC character error rate; English is scored with NFC/NFKC lowercase whitespace-token word error rate. Per-language metrics remain separate. No scores are filled for absent or unrun samples. The report stores sample IDs and hashes, not reference transcripts, hypotheses, audio or personal metadata.

## Audio duration and real-time factor

Audio duration comes from prepared PCM WAV headers. Inference RTF = transcription duration / audio duration. End-to-end RTF = total provider latency / audio duration. Model load, inference and total provider latency remain separate; total includes worker/process overhead and model loading. Percentiles use nearest rank (for n=10, P95 is the maximum).

| Cohort | Samples | Audio total / P50 / range | Model load P50/P95 | Inference P50/P95 | Total provider P50/P95 | Inference RTF P50/P95 | End-to-end RTF P50/P95 |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| zh-TW scripted | 10 | 38.964 s / 3.816 s / 2.520–5.076 s | 9.15/9.91 s | 13.69/74.17 s | 26.94/96.88 s | 3.73/29.43 | 7.26/38.44 |
| English spontaneous | 10 | 178.956 s / 4.968 s / 2.052–70.992 s | 8.95/9.24 s | 13.55/130.65 s | 26.01/142.65 s | 2.55/6.47 | 5.07/12.67 |

## Error and P4G candidate review

This is not a code-switch test: zh-TW samples are scripted read speech and English samples are spontaneous English. None of the 20 samples is a mixed Chinese-English utterance. The report contains no reference or hypothesis text.

The 16 candidate drafts remain unverified and unapproved. Overlapping heuristic tags: incorrect_technical_terms 4, missing_words 8, performance 7, punctuation 6, unsupported_transcript 2. No case produced a negation or language-switching tag. The four `incorrect_technical_terms` labels are not validated terminology errors; the current heuristic broadly treats differing ASCII tokens as possible terminology. The English source references had none of the checked technical-term examples, so terminology error rate is NOT_AVAILABLE.

Highest per-sample normalized error rates (text omitted):

| Sample | Language / metric | Edits / reference units | Rate | Heuristic candidate tags |
| --- | --- | ---: | ---: | --- |
| en-test-01 | en / WER | 2 / 1 | 200.00% | incorrect_technical_terms, missing_words, unsupported_transcript |
| zh-tw-test-01 | zh-TW / CER | 5 / 4 | 125.00% | missing_words, performance, unsupported_transcript |
| zh-tw-test-02 | zh-TW / CER | 4 / 10 | 40.00% | missing_words |
| zh-tw-test-09 | zh-TW / CER | 2 / 7 | 28.57% | missing_words |
| en-test-03 | en / WER | 61 / 217 | 28.11% | incorrect_technical_terms, missing_words, performance |

`Dataset SHA-256: NOT_AVAILABLE` means a hash of either full source corpus/archive was not computed. The selected-sample manifest SHA-256 above is retained, alongside per-sample audio hashes; it is not a substitute for a full dataset hash.

## Failed or incomplete cases

- None recorded.

## Improvement review candidates

16 deterministic draft candidate(s); each is marked unverified and requires human review. No proposal is auto-approved or sent to P4G storage/GitHub.

## Limitations

- Separate zh-TW scripted and English spontaneous cohorts; not a mixed-language code-switch or workplace workflow evaluation.
- Full source-corpus/archive SHA-256 was not computed; `Dataset SHA-256` remains `NOT_AVAILABLE`. The manifest SHA identifies the selected-sample manifest only.
- The 16 P4G candidates are heuristic drafts, unverified and unapproved. Raw reference and hypothesis transcripts are intentionally omitted.
- Technical-term error rate is `NOT_AVAILABLE`; the broad candidate heuristic does not establish actual term errors.
