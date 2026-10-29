# P5 ASR Evaluation

- Status: **NOT_RUN**
- Generated: 2026-10-29T11:25:44.256Z
- Dataset version: P5 per-language datasets (20 samples)
- Dataset revision: Multiple per-language revisions; see below
- Dataset SHA-256: NOT_AVAILABLE
- Sample manifest SHA-256: sha256:6939e4d0977371bfadd109bee5a04275e03c0d8ecbc6fb37e86ce26eb2294b11
- Sampling seed: codeswitch-p5-small-2026-01
- Provider / model: NOT_RUN / NOT_RUN
- Runtime / device: NOT_RUN / NOT_RUN
- Samples: zh-TW 10, English 10, total 20

## Dataset revisions by language

zh-TW: cv-corpus-27.0-2026-09-11 (cv-corpus-27.0-2026-09-11; zh-TW; test)
en: sps-corpus-5.0-2026-09-11-en (sps-corpus-5.0-2026-09-11-en; en; test)

## Results by language

| Language | Complete | Failed | Timeout | Not run | CER | WER | Total latency P50 / P95 | Model load P50 / P95 |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| zh-TW | 0 | 0 | 0 | 10 | NOT_RUN | — | NOT_RUN / NOT_RUN | NOT_RUN / NOT_RUN |
| en | 0 | 0 | 0 | 10 | — | NOT_RUN | NOT_RUN / NOT_RUN | NOT_RUN / NOT_RUN |

Punctuation is removed under the fixed scoring normalization. zh-TW is scored with Unicode NFC character error rate; English is scored with NFC/NFKC lowercase whitespace-token word error rate. Per-language metrics remain separate. No scores are filled for absent or unrun samples. The report stores sample IDs and hashes, not reference transcripts, hypotheses, audio or personal metadata.

## Failed or incomplete cases

- zh-tw-test-01: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- zh-tw-test-02: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- zh-tw-test-03: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- zh-tw-test-04: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- zh-tw-test-05: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- zh-tw-test-06: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- zh-tw-test-07: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- zh-tw-test-08: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- zh-tw-test-09: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- zh-tw-test-10: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- en-test-01: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- en-test-02: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- en-test-03: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- en-test-04: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- en-test-05: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- en-test-06: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- en-test-07: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- en-test-08: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- en-test-09: not_run (WINDOWS_ASR_NOT_CONFIGURED)
- en-test-10: not_run (WINDOWS_ASR_NOT_CONFIGURED)

## Improvement review candidates

0 deterministic draft candidate(s); each is marked unverified and requires human review. No proposal is auto-approved or sent to P4G storage/GitHub.

## Limitations

- Windows Whisper is not configured in this execution environment. Set CODESWITCH_ASR_PYTHON and CODESWITCH_ASR_MODEL_FILE to the already-installed Windows Python and Whisper checkpoint before running the smoke test; no model download is performed.
