# P7A ASR Provider Comparison Plan

**Status: plan only. Live benchmark: NOT_RUN.** No Nemotron weights were downloaded and no Nemotron inference or score was generated.

## Candidates and evidence status

| Provider | Candidate/model | Current evidence | Unresolved |
| --- | --- | --- | --- |
| Existing baseline | Windows Whisper `large-v3` | Existing P5 report: 20 Common Voice samples completed on Windows CPU; zh-TW scripted CER 12/77 (15.58%), English spontaneous WER 75/430 (17.44%). This is historical baseline evidence, not rerun in P7A. | Samples are not code-switched workplace commands. Validate exact manifest/revision before a future paired run. |
| New candidate | Nemotron 3.5 Transcribe 30B-A4B | Official card lists 40 languages, Mandarin and English, and code-switch support. | Large deployment reference (H100 80 GB); no W7900, Hailo, or CodeSwitch live result. |
| New candidate | Nemotron 3.5 ASR Streaming 0.6B | Official card lists English and Mandarin `zh-CN`; official NeMo-Speech.cpp offers Windows local GGUF path. | `zh-TW` absent, explicit code-switch capability not claimed, and exact Windows/AMD backend not tested. |

The historical P5 numbers are not comparable to NVIDIA published scores because datasets, sample cohorts, normalization, and model/runtime differ. Do not combine scripted zh-TW and spontaneous English into one aggregate score.

## Paired Common Voice experiment

When models/runtime are available, pin one Common Voice corpus revision, split, source IDs, original and canonical WAV SHA-256 values, and license/attribution. Use the exact same canonical recordings for all three providers. Reuse the Owner-approved local P5 manifest only after confirming local availability and that the recordings are still within their license/retention conditions. If any sample cannot be processed by a provider, report it as a failed/not-run case; do not silently replace or truncate it.

Report cohorts separately:

1. zh-TW scripted: existing cohort, with CER and character error counts.
2. English spontaneous: existing cohort, with WER and word error counts.
3. P3C human Chinese-English code-switch recordings: separate future cohort, recorded with consent, reference transcript reviewed independently, with commands/constraints specifically designed for speech workflow use. Common Voice alone does not establish this result.

## Metrics and denominators

- **CER / WER:** fixed versioned normalization and edit count / reference character or word count, reported by language and dataset split. Empty reference denominator is `null`.
- **Negation preservation:** number of gold negations faithfully present / total gold negation spans. Report omission, polarity flip, and ambiguity separately. Do not infer this from overall CER/WER.
- **Technical-term accuracy:** correctly transcribed predeclared terms / all gold term occurrences. Publish term lists only where license and privacy permit; annotate exact terminology, not generic changed tokens.
- **Language/code-switch accuracy:** correct language tag/segment count and switches detected / annotated segments or boundaries. A model’s language ID is a hypothesis, not evidence that segment text is correct.
- **Latency:** provider invocation wall-clock from request start to final transcript; report P50/P95 and failures/timeouts. Record model load separately, not folded into inference. For streaming, record first partial latency, chunk/final latency, chunk size, and end-of-utterance finalization.
- **RTF:** inference time divided by exact decoded audio duration; report per case and P50/P95. Provide end-to-end RTF separately if it includes process startup, audio decode, or model load.
- **Raw workflow success:** parser/validator result after using the raw transcript, including card count, slots, evidence, and constraint handling.
- **Reviewed workflow success:** user-reviewed/corrected transcript and resulting card outcome; report transcript corrections and confirmation separately. It is not a measure of ASR alone.

No rejection-all policy may score as full success. Mock records must remain scoreless for accuracy; use existing `createSpeechBenchmarkReport` behavior.

## Controlled procedure

1. Record immutable dataset manifest hash, source/license, sample SHA, language/split, normalization version, and dataset references.
2. Record model repository/revision/digest, quantization/file SHA, runtime version/commit, OS, CPU, RAM, accelerator/backend and actual offload evidence.
3. Freeze prompts/configuration, language-ID mode, chunk size, audio preprocessing, timeout and retry limit before scoring.
4. Run one zh-TW and one English smoke per candidate; smoke failures block or mark that provider’s full run according to a predeclared protocol. Do not tune on the held-out evaluation cohort.
5. Run identical sample IDs. Save only approved aggregate/error metadata in version control; audio and sensitive transcript content remain local-only.
6. Review raw transcript, constraints and final work cards independently. A model omission remains a model error even if later validation catches it.
7. Publish full numerator/denominator, failed IDs, timeout counts, latency distributions, and test set limitations. Mark unsupported cohorts `NOT_RUN`, never zero.

## P3C code-switch test plan

Recruit consenting speakers for original workplace-style mixed zh-TW/English utterances. Include code-switched technical terms, named entities, relative dates, recipient names without invented addresses, multiple intents, negation, prerequisites, and ambiguous commands. Retain a raw audio SHA and independently reviewed reference transcript; maintain a separate user-corrected transcript. Avoid using public Common Voice speech as workplace commands. Report per-speaker/accent aggregate cautiously and do not publish identifiable raw audio without consent.

Run each provider on the same audio. Compare transcript CER/WER, term accuracy, language-switch locations, negation and prerequisite preservation, raw versus reviewed workflow success, and total/provider-only latency and RTF. Require transcript review and the existing Work Card validation/confirmation flow. Do not let an ASR score authorize execution.

## Current result

Nemotron contract and mock boundary tests are implemented, but no model was loaded and no benchmark was run. The only project-level live ASR evidence remains the earlier Windows Whisper P5 evaluation; it is not a code-switch evaluation. The 0.6B model is the more plausible next candidate to test, but there is not enough evidence to replace Whisper or expose Nemotron in the product UI.
