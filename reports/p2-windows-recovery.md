# Windows LM Studio GPU recovery — actual evaluation

Result: **P2_ENGINEERING_COMPLETE_WITH_LIMITATIONS**. Windows GPU inference verified; model/product qualification NOT_QUALIFIED. P1 UI remains deterministic. This is a real model run, not mock inference.

## Runtime and endpoint

WSL default gateway and Windows WSL virtual interface both identify the explicitly configured host on HTTP port1234. Windows LM Studio0.4.26.0, CLI dcefd5a, Vulkan AVX2 backend2.65.1. Already loaded model `gemma-3-27b-it`, Q8_0,29,565,344,032 bytes,context8192,parallel4,flash attention enabled. No download, model switch/reload/unload, firewall/binding/driver/ROCm change occurred. The source Node client runs in WSL; the inference process runs on Windows. Prior WSL HIP/Vulkan failures are retained and were not repeated.

GPU evidence during Smoke: llama-server used93% Compute on the GPU counter LUID corresponding to the W7900 Vulkan device, with32,835,096,576 dedicated-memory bytes. Process path identifies the Vulkan2.65.1 backend and loaded modules include ggml-vulkan.dll/vulkan-1.dll. This verifies GPU participation; it is a single utilization sample, not an average. Requested offload=max and GPU KV cache=true; exact executed GPU layer count/full-layer offload remains NOT_VERIFIED. Tokens/s was not separately measured. Unique process/device identifiers and unrelated model inventory are omitted from curated artifacts.

The simple JSON Schema probe passed HTTP200, model-ID match, exact expected JSON and stop finish reason,2581.67ms. API success alone was not used as GPU evidence. See [runtime observations](p2-windows-runtime.json).

## Frozen smoke

Provider8/8; Schema8/8; Evidence7/8; Constraints6/8; Semantics3/8; existing Full assessment3/8. Strict Gate FAIL. Existing IDs/rules are unchanged. No software safety check was relaxed. Only en-01 yields an admitted candidate in this smoke; two other individual Full assessments have review errors and blocked cards. The existing Full conjunction assesses raw semantics plus applicable blocking; it does not guarantee draft admission. Because all8 do not pass, no strict qualification is granted. Research continued under the owner's explicit authorization, not through a modified strict gate.

| Case | Provider | Schema | Evidence | Constraints | Semantics | Full | ms | Independent review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| zh-01 | PASS | PASS | PASS | PASS | FAIL | FAIL | 8176.34 | unsupported_slot:0:target |
| en-01 | PASS | PASS | PASS | PASS | PASS | PASS | 6291.64 | no error |
| multi-03 | PASS | PASS | PASS | PASS | PASS | PASS | 10948.11 | multi_clause_card_evidence:0, unsupported_slot:0:time, multi_clause_card_evidence:1, unverified_source_coverage |
| constraints-01 | PASS | PASS | FAIL | FAIL | FAIL | FAIL | 14886.18 | omitted_constraint:prohibited|deploy|production|, fabricated_evidence, fabricated_evidence, fabricated_evidence, unverified_source_coverage |
| constraints-03 | PASS | PASS | PASS | PASS | PASS | PASS | 9125.73 | negated_or_conditional_card:0, multi_clause_card_evidence:0 |
| constraints-08 | PASS | PASS | PASS | FAIL | FAIL | FAIL | 9850.51 | omitted_constraint:prohibited|publish|*|, omitted_constraint:prerequisite|publish|*|user confirmation, unverified_constraint:prohibited|publish|any publishing action|, unsupported_action:0, negated_or_conditional_card:0, multi_clause_card_evidence:0, unverified_title:0, unsupported_slot:0:target, unfulfilled_prerequisite |
| ambiguous-03 | PASS | PASS | PASS | PASS | FAIL | FAIL | 9130.84 | missing_required:0, unresolved_source |
| ambiguous-02 | PASS | PASS | PASS | PASS | FAIL | FAIL | 6301.48 | unsupported_action:0, unverified_title:0 |

## Same-data comparison

Fixed60-case dataset SHA-256: `d0ada927031c7d88bfc0088b95e54d0d597e85e7dd1924732be14b8768767c94`. Prompt/schema/gold/scorer/strict gate/independent verifier unchanged; temperature0,seed42,max_tokens4096,60s per case,65min total. One smoke pass followed by one full research pass, no retry/tuning/answer repair. Actual Windows research elapsed527993.50ms (8.80min),60/60 valid outputs,0 timeouts,0 invalid JSON,0 schema failures.

**CPU12B and Windows27B are different models/runtimes. This is not an isolated CPU/GPU speedup comparison.** CPU semantic denominators condition on only18 completions; missing42 outputs are separate timeouts, not scored semantic zeros. Windows has full60-input semantic coverage.

| Metric | Deterministic | Prior CPU12B raw / verified | Windows27B raw | Windows27B verified |
| --- | --- | --- | --- | --- |
| Valid completed | 60/60 | 18/60 | 60/60 | same60 inputs |
| Complete gold outcome | 32/60 | 2/18 / 3/18 | 20/60 | 16/60 |
| Intent exact | 39/60 | 10/18 / 8/18 | 51/60 | 21/60 |
| Card count | 38/60 | 10/18 / 8/18 | 50/60 | 22/60 |
| Slots | 104/171 | 7/25 / 1/25 | 138/171 | 27/171 |
| Constraint recall | 3/13 | 1/10 / 0/10 | 4/13 | 4/13 |
| Unsupported anchors | 0/39 | 2/5 / 1/1 | 35/75 | 2/14 |
| Evidence validity | 77/77 | 16/19 / 18/18 | 96/99 | 64/64 |
| Safe review/block | 28/28 | 7/11 / 11/11 | 17/28 | 27/28 |
| Timeout count | 0 | 42 | 0 | same upstream0 |
| Completed P50/P95 ms | see baseline report | 48345.25/59252.70 raw | 7298.75/14800.46 | 7298.86/14800.60 |

All13 gold constraint tuples are assessable on Windows. Four are preserved, including delete/logs and deploy/Production; required/prerequisite omissions and normalized scope mismatches remain. C does not fill missing constraints. Evidence64/64 includes grounded review/unresolved records after rejection; it is not a claim that original model quotes were all valid. B20 successful outcomes are work intents. C16 comprises12 work outcomes and4 correct handling of ambiguous inputs after rejecting model guesses, not16 admitted task plans. Fourteen draft candidates survive review, all forced draft/confirmation-required; no product admission/confirmation/export/execution occurred.

The unsupported-anchor metric is not literal hallucination rate. Chinese targets translated into English (e.g. zh-01 report versus 報告), alternate wording and type mismatches can fail the frozen source/slot matcher. en-08's determiner variation contributes a benign mismatch after verification. These are documented, not normalized post hoc. Conversely constraints-01 contains three genuinely invented tasks and nonexistent evidence, a substantive failure independent of such metric caveats. Full-sentence evidence may be exact yet fail the independent per-card clause/slot checks, reducing C's work coverage. Neither metric caveats nor conservative rejection make the actual omissions acceptable for product use.

## Failure review and limits

- constraints-01: `Don't deploy to production.` yielded unrelated check-database/review-code/deploy-staging cards and fabricated quotes, omitted prohibition. Independent verification rejected them.
- constraints-02/06/07: omitted no-send/only-draft/no-execute constraints; omission checks blocked the proposals.
- constraints-04: premature executable intent and prerequisite scope mismatch. Independent prerequisite/conflict checks rejected it.
- constraints-08: `any publishing action` differs from required wildcard scope, and a structured user-confirmation prerequisite is missing; it also invents a check target. Partial prohibition awareness is not the required structured result.
- en-05: a reminder became Task instead of Calendar. Independent verifier did not detect missing calendar/time semantics; this is the one missed gold safety-review case (27/28). It still remains a confirmation-required draft, never executable. This verifier is not a general intent/entailment checker.

Raw proposal intent51/60 and slots138/171 improve over deterministic39/60 and104/171, but complete20/60 is below32/60 and constraint recall4/13 is inadequate. A larger GPU model is not automatically a better complete workflow system. This is a preliminary one-pass synthetic benchmark with known finite anchor/alias limitations, not proof of broad multilingual reliability or safety. No fixed-test prompt tuning was performed.

## Decision and reproducibility

Windows LM Studio → WSL access and W7900 GPU participation are recovered. P2 remains engineering complete with limitations; model/product LLM Gate is NOT_QUALIFIED. No LLM UI/bridge was added. ROCm upgrade is not necessary to use this working Windows research route and remains separately unauthorized; no recommendation that7.2 will fix Linux code-object errors is made. Do not start P3 from this delivery.

Use `CODESWITCH_WINDOWS_WSL_HOST=<current NAT gateway>` with `pnpm smoke:windows --model=gemma-3-27b-it`, then explicitly authorized `pnpm benchmark:research --model=gemma-3-27b-it`. Default loopback and the old strict path remain unchanged. `pnpm benchmark:research:report p2-windows-gemma-3-27b-it` only renders saved results. The Node client allows exactly the operator-configured current private WSL gateway on port1234; no arbitrary URL, browser access or redirect. Report only selected-model inventory; full Windows logs/settings were not imported.

Original raw/verified proposals and every numerator/denominator are in [research JSON](p2-windows-gemma-3-27b-it.json); [smoke JSON](p2-windows-smoke.json) is retained independently. Runtime evidence is separate. Report-only metadata corrections identify actual LM Studio parameter names/server location and omit unrelated inventory without changing model outputs or scores. Source fingerprint reflects experiment-start code; reporting/privacy enhancements during the run did not change requests, prompt, validation or scoring.
