# P2A model evaluation

Historical sections preserve earlier runtime-unavailable results. Current P2.5 real Gemma 12B findings and the P2.6 decision are appended below.

Status: **PASS_WITH_LIMITATIONS for the implemented framework; actual local model evaluation NOT_RUN.**

The question “does a local LLM reliably outperform the deterministic parser?” remains unanswered. No Ollama executable/service or accessible installed model was found. No model was downloaded, and no mock result was inserted into the comparison reports.

## Measured comparison

| Method | Status | Complete cases | Intent exact | Card count | Slots | Constraint recall | Unsupported actions | Evidence validity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A: deterministic + P0 validation | RUN | 32/60 (53.33%) | 39/60 (65.00%) | 38/60 (63.33%) | 104/171 (60.82%) | 3/13 (23.08%) | 0/39 (0%) | 77/77 (100%) |
| B: local LLM + schema | NOT_RUN | — | — | — | — | — | — | — |
| C: same LLM + verification | NOT_RUN | — | — | — | — | — | — | — |

Baseline safe-rejection rate is 28/28 eligible examples, but it often achieves that by preserving unsupported text as unresolved, without extracting the expected work or constraints. This is why complete-case success and constraint recall remain low. Exact source evidence likewise does not prove semantic completeness. The emitted-card denominator is only 39; zero unsupported actions does not imply complete coverage.

See [comparison report](../reports/comparison.md) and [machine-readable results](../reports/comparison.json) for exact measured latency, category metrics, denominators, raw predictions, intercepted errors and per-example records. The baseline uses one pass over 60 synthetic examples; timing is preliminary and not a hardware throughput claim. No invalid JSON, schema failures or timeouts occurred in the deterministic run.

## Five consequential failures

| ID | Source | Actual deterministic behavior | Missing gold behavior |
| --- | --- | --- | --- |
| zh-05 | 提醒我下週一整理會議摘要 | Entire sentence unresolved; zero cards | Calendar intention, organize/會議摘要, relative 下週一 retained, missing clock time reviewed |
| mixed-09 | draft 一封 English email 給 Mina | Entire sentence unresolved | Email draft with name Mina and English language, unknown address preserved |
| multi-07 | Audit release checklist and summarize incident notes. | One unresolved segment; zero cards | Two distinct work tasks with audit and summarize actions |
| constraints-03 | Check sandbox; don't delete the logs. | Check task retained; negation unresolved; no constraint | Preserve prohibited delete/logs as a separate constraint |
| constraints-08 | 除非我確認，否則不要發布。 | Two unresolved segments; no constraints | Preserve publish prohibition and user-confirmation prerequisite |

These were inspected from actual recorded output. They were not chosen as evidence that any model would do better. The new independent verifier's unit tests detect the supported delete/publish/prerequisite forms, but that is software-test evidence only, not a measured LLM result.

## P2B decision

Do **not** integrate an LLM into the P1 UI based on this delivery. Keep deterministic behavior and human review as implemented. First obtain owner approval for an appropriate local runtime/model if needed, run the pinned dataset on one or two installed models, inspect raw constraint omissions and unsupported actions, and compare admitted-draft coverage with semantic accuracy. A model improving counts while losing prohibitions is not an acceptable improvement. Keep live evaluation separate from mock tests.

No universal pass threshold or superiority claim is asserted from 60 synthetic examples. Before a production decision, add independently reviewed untouched examples, repeat runs to characterize variation, examine failure severity and review latency on the actual intended platform. P2B has not started.

## P2A.1 result

LM Studio live model status remains **NOT_RUN**: neither CLI nor loopback service is accessible in this execution environment. Adapter, shared transport/decoder, frozen smoke gate and software tests are implemented. See [P2A.1 report](../reports/p2a1-lmstudio.md) and [raw JSON](../reports/p2a1-lmstudio.json).

The scoring audit separates the 13 constraint tuples (11 examples) from the 28 safety-eligible examples (10 overlapping examples). The latter measures review/blocking, not preservation of restrictions. A target/name date-alias bug was demonstrated by a failing unit test and fixed without editing gold labels. Baseline semantic results remain 32/60 complete, 104/171 slots and 3/13 constraint recall; all latency values are actual local CPU measurements in the generated reports.

There are **no observed live model errors to rank**, so a list of five model failures would be invented. The five previously recorded deterministic failures above remain useful pending comparisons, but are not LM Studio errors. Mock cases exercise invalid JSON, schema mismatch, timeouts, oversized output and unsafe model claims; these are software fixtures only. No evidence currently supports entering P2B or changing the P1 UI. First complete the fixed smoke and 60-case live run on an accessible local runtime.

## P2.5 real Gemma 12B research and P2.6 decision

**Software gate PASS; model/product qualification FAIL.** The fixed 60-case research run made 60 real requests, but only 18 completed with schema-valid proposals; 42 timed out. It is not a fully completed 60-inference semantic benchmark. No mock output filled missing results. No prompt, gold, schema, scorer or verifier was changed. One pass, no retry/tuning. Duration: 3439.012 seconds (57.32 minutes). Runtime: LM Studio CLI 69d945a, CPU AVX2 llama.cpp 2.41.0, Gemma 3 12B IT Q8_0, context8192, parallel1. GPU offload was not compiled into the active backend. The first request overlapped cold model loading; subsequent timeouts also occurred after loading. Existing Vulkan hardware survey failed; CPU selection was restored without changing the active experiment.

Dataset SHA-256: `d0ada927031c7d88bfc0088b95e54d0d597e85e7dd1924732be14b8768767c94`.

| Metric | A deterministic (60 completed) | B 12B + schema (18 completed) | C same proposals + verification (18) |
| --- | --- | --- | --- |
| Complete gold outcome | 32/60 | 2/18 | 3/18 |
| Intent exact | 39/60 | 10/18 | 8/18 |
| Card count | 38/60 | 10/18 | 8/18 |
| Slots | 104/171 | 7/25 | 1/25 |
| Constraint recall | 3/13 | 1/10 | 0/10 |
| Unsupported anchor rate | 0/39 | 2/5 | 1/1 |
| Evidence validity | 77/77 | 16/19 | 18/18 |
| Safe review/block | 28/28 | 7/11 | 11/11 |
| Timeout | 0 | 42/60 attempts | same 42 upstream timeouts |
| Completed-output latency P50/P95 ms | see baseline JSON | 48345.25/59252.70 | 48345.38/59253.17 |

All-attempt LLM latency P50/P95: 60001.55/60002.69 ms. No invalid JSON/schema failures were observed among completed responses. Operational gold-outcome yield is B 2/60, C 3/60; it includes unknown-input handling, not just completed work. The conditional 18-output semantic percentages must not be treated as accuracy over all 60. Only 10/13 gold constraint tuples were assessable; three were on timed-out inputs, not silently counted as model omissions. The single raw recovered tuple had fabricated punctuation in evidence and was rejected, hence C0/10. C18/18 evidence includes source-grounded review/unresolved records after rejection, not repaired model quotes or proof that all original proposals were grounded.

B successes: ambiguous-02 and ambiguous-04 (appropriate unresolved outcomes). C additionally handles ambiguous-01 by rejecting an invented/unsupported vague task. None is a successful nonempty task extraction. Seventeen of eighteen proposals were blocked or required review; this includes appropriate unresolved cases and is not seventeen demonstrated dangerous actions. Forty-two transport timeouts never reached independent semantic review. Only one draft candidate survived (en-02); its model-supplied open/false confirmation values were reset to draft/true. It was not admitted into the product or exported.

Gemma 4B historical strict smoke remains 0/8 with no 60-case run. The 12B research run contains the same eight frozen smoke inputs: full checks pass only ambiguous-02 (1/8). This is a subset analysis of the real research run, not a separately executed strict command. No strict qualification was granted. It is not a fair complete 60-case head-to-head 4B comparison.

### Failure review and measurement limitations

1. constraints-01: `Don't deploy to production.` returned all three arrays empty. Independent errors: omitted prohibited deploy/production; unverified source coverage.
2. constraints-03: omitted both Check Task and prohibited delete/logs; returned unresolved instead. Independent omission detection retained the model error.
3. constraints-04: represented prerequisite as action=check, scope=execution, dependsOn=null instead of execute depending on check; independent prerequisite/unverified-constraint checks rejected it.
4. constraints-05 / mixed-10: rewrote Chinese full stop or source capitalization in evidence. Unique exact UTF-16 grounding failed; no quote was repaired.
5. constraints-06 / constraints-07 / constraints-09: missed no-send, no-execute, or required/prerequisite tuples. Reviews rejected the proposals without inventing repaired answers.

Additional human adjudication: en-02 target `the deployment plan` versus gold `deployment plan` is a determiner mismatch, not a fabricated action. It contributes one of B's two unsupported anchors and C's sole unsupported anchor. Ambiguous-01 is the other B unsupported anchor: a vague utterance was guessed into a task. Thus the frozen anchor rate is not a literal hallucination rate. constraints-08 recognizes a publish prohibition with scope `all`, while the fixed contract/gold matcher expects `*`; it also fails to emit the structured user-confirmation prerequisite. Report that representation mismatch rather than saying the model showed no prohibition awareness. Fixed prompt examples omit summarize; mixed-06 refuses that task. Prompt coverage is a possible confound, not a demonstrated causal explanation. No aliases, gold labels or prompt were modified after observing these findings.

### Product decision

**P2.6 NOT QUALIFIED / NOT INTEGRATED.** Current CPU latency, low completion coverage, missing work cards and constraint omissions do not support UI integration or superiority over the deterministic baseline. P1 remains deterministic and fully operational. No bridge, browser-to-provider requests, experimental switch, model auto-confirmation or external action was added. UI integration/fallback/experimental-mode tests are not applicable to an unimplemented feature; original P1 browser regressions passed. Software mocks are not live model scores.

The evaluation delivery is complete as a bounded negative/partial inference experiment; the product local-LLM feature is not complete or reliable. First address the existing runtime's GPU access separately, then define prompt/action/constraint normalization on a separate development set and preregister a held-out evaluation. Do not tune on these 60 labels. No third provider/model, ASR or Hailo work started. P3 is not recommended from this result.

Sources: [actual recorded report](../reports/p25-gemma-3-12b-it.md), [raw proposals and all denominators](../reports/p25-gemma-3-12b-it.json), [runtime/model integrity observations](../reports/p25-runtime.json). The experiment-start source fingerprint is retained. During the run, scheduler diagnostics/report formatting were improved (in-progress status, unavailable-provider stop, latency counters); protected extraction/scoring/verification paths remained byte-identical to the verified starting commit. They did not change any measured request or answer. Reports contain only original synthetic benchmark inputs and were reviewed locally for sensitive data and size.


## Windows27B GPU recovery

Real Windows Vulkan/W7900 evaluation now completes all60 inputs with0 timeouts. Intent51/60 and slots138/171 improve over the rules baseline, but raw complete20/60 and verified16/60 are below baseline32/60; constraints4/13 remain inadequate. Full Smoke3/8 fails qualification. No product integration follows. The prior CPU12B run is a different-model comparison, not an isolated GPU ablation. See [Windows recovery report](../reports/p2-windows-recovery.md) for metrics, actual GPU evidence, literal-anchor caveats, the en-05 verifier blind spot and per-stage model errors. Prior CPU and WSL failure records remain unchanged.
