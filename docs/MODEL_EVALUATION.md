# P2A model evaluation

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
