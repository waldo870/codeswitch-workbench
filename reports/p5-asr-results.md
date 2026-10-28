# P5 ASR Evaluation

- Status: **NOT_RUN**
- Generated: 2026-10-28T16:32:58.757Z
- Dataset version: Common Voice Scripted Speech 27.0 (planned; no local sample manifest)
- Dataset revision: NOT_PINNED
- Dataset SHA-256: NOT_AVAILABLE
- Sample manifest SHA-256: NOT_AVAILABLE
- Sampling seed: codeswitch-p5-small-2026-01
- Provider / model: NOT_RUN / NOT_RUN
- Runtime / device: NOT_RUN / NOT_RUN
- Samples: zh-TW 0, English 0, total 0

## Results by language

| Language | Complete | Failed | Timeout | Not run | CER | WER | Total latency P50 / P95 | Model load P50 / P95 |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| zh-TW | 0 | 0 | 0 | 0 | NOT_RUN | — | NOT_RUN / NOT_RUN | NOT_RUN / NOT_RUN |
| en | 0 | 0 | 0 | 0 | — | NOT_RUN | NOT_RUN / NOT_RUN | NOT_RUN / NOT_RUN |

Punctuation is removed under the fixed scoring normalization. zh-TW is scored with Unicode NFC character error rate; English is scored with NFC/NFKC lowercase whitespace-token word error rate. Per-language metrics remain separate. No scores are filled for absent or unrun samples. The report stores sample IDs and hashes, not reference transcripts, hypotheses, audio or personal metadata.

## Failed or incomplete cases

- None recorded.

## Improvement review candidates

0 deterministic draft candidate(s); each is marked unverified and requires human review. No proposal is auto-approved or sent to P4G storage/GitHub.

## Limitations

- No local sample manifest is present. Common Voice MDC sample retrieval is pending Owner-provided email/access and terms acceptance; FLEURS has no Traditional Chinese Mandarin (zh-TW) configuration. No audio was downloaded.
- Windows Whisper is not configured in this environment. Set the existing CODESWITCH_ASR_PYTHON and CODESWITCH_ASR_MODEL_FILE values after owner-approved local runtime setup; no model download is performed.
