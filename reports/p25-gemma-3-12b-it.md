# P2.5 fixed-prompt research

Timestamp: 2026-10-27T22:58:31.197Z

Runtime metadata (original discovery; see p25-runtime.json for verified CPU observations): {"model":"gemma-3-12b-it","provider":"lmstudio","gpu":"NOT_VERIFIED","quantization":"See MODEL_PROVENANCE.md"}

Dataset: d0ada927031c7d88bfc0088b95e54d0d597e85e7dd1924732be14b8768767c94; 60 frozen cases.

Attempted: 60/60; schema-valid completed outputs: 18; status: DATASET_COMPLETE. Product admission: false.

Timeouts: 42; schema failures: 0; invalid JSON: 0.

Provider failures are non-semantic outcomes. B/C percentages below condition on valid completed outputs; compare coverage before interpreting them. No timeout is silently counted as a semantic mistake or constraint omission. Complete/60 operational yield is distinct from conditional semantic accuracy.

| Pipeline | Coverage | Complete | Intent | Count | Slots | Constraints | Unsupported actions | Evidence | Safe review/block | Completed P50/P95 ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A deterministic | 60/60 | 32/60 (53.33%) | 39/60 (65.00%) | 38/60 (63.33%) | 104/171 (60.82%) | 3/13 (23.08%) | 0/39 (0.00%) | 77/77 (100.00%) | 28/28 (100.00%) | 0.02/0.13 |
| B local LLM + schema | 18/60 | 2/18 (11.11%) | 10/18 (55.56%) | 10/18 (55.56%) | 7/25 (28.00%) | 1/10 (10.00%) | 2/5 (40.00%) | 16/19 (84.21%) | 7/11 (63.64%) | 48345.25/59252.70 |
| C independent verification | 18/60 | 3/18 (16.67%) | 8/18 (44.44%) | 8/18 (44.44%) | 1/25 (4.00%) | 0/10 (0.00%) | 1/1 (100.00%) | 18/18 (100.00%) | 11/11 (100.00%) | 48345.38/59253.17 |

| Category | Attempted | Valid completed | Complete/valid | Gold constraints recovered/assessed |
| --- | --- | --- | --- | --- |
| zh | 10 | 0 | NOT_EVALUABLE (0 eligible observations) | NOT_EVALUABLE (0 eligible observations) |
| en | 10 | 3 | 0/3 (0.00%) | NOT_EVALUABLE (0 eligible observations) |
| mixed | 15 | 4 | 0/4 (0.00%) | NOT_EVALUABLE (0 eligible observations) |
| multi | 10 | 0 | NOT_EVALUABLE (0 eligible observations) | NOT_EVALUABLE (0 eligible observations) |
| constraints | 10 | 8 | 0/8 (0.00%) | 1/10 (10.00%) |
| ambiguous | 5 | 3 | 2/3 (66.67%) | NOT_EVALUABLE (0 eligible observations) |

All-attempt latency P50/P95 (includes timeouts): 60001.55/60002.69 ms.

Gemma 4B historical strict smoke: 0/8 Full Smoke; its 60-case benchmark was NOT_RUN. It is not a comparable 60-case score.

| Case | Provider error | Provider | Schema | Evidence | Constraint | Semantic | Full | Latency ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| zh-01 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60000.64 |
| zh-02 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.33 |
| zh-03 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60001.24 |
| zh-04 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.34 |
| zh-05 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.09 |
| zh-06 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.44 |
| zh-07 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.18 |
| zh-08 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.21 |
| zh-09 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60003.01 |
| zh-10 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60001.51 |
| en-01 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 46276.16 |
| en-02 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 56270.08 |
| en-03 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60001.86 |
| en-04 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60001.10 |
| en-05 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60001.92 |
| en-06 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.04 |
| en-07 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.26 |
| en-08 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.34 |
| en-09 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60003.12 |
| en-10 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 47500.12 |
| mixed-01 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.06 |
| mixed-02 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 47988.78 |
| mixed-03 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.27 |
| mixed-04 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60001.55 |
| mixed-05 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60001.51 |
| mixed-06 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 49700.81 |
| mixed-07 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.21 |
| mixed-08 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60001.81 |
| mixed-09 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.49 |
| mixed-10 | none | PASS | PASS | FAIL | PASS | PASS | FAIL | 59252.70 |
| mixed-11 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.14 |
| mixed-12 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60001.44 |
| mixed-13 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60001.78 |
| mixed-14 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60000.79 |
| mixed-15 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 50871.42 |
| multi-01 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60001.57 |
| multi-02 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.07 |
| multi-03 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.22 |
| multi-04 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60001.72 |
| multi-05 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60001.55 |
| multi-06 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.27 |
| multi-07 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60001.87 |
| multi-08 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60001.40 |
| multi-09 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.32 |
| multi-10 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.79 |
| constraints-01 | none | PASS | PASS | FAIL | FAIL | FAIL | FAIL | 41345.78 |
| constraints-02 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60000.72 |
| constraints-03 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 48345.25 |
| constraints-04 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 46912.98 |
| constraints-05 | none | PASS | PASS | FAIL | PASS | FAIL | FAIL | 58933.52 |
| constraints-06 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 44397.14 |
| constraints-07 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 57645.26 |
| constraints-08 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 58974.04 |
| constraints-09 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 55604.06 |
| constraints-10 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60001.30 |
| ambiguous-01 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 56848.12 |
| ambiguous-02 | none | PASS | PASS | PASS | PASS | PASS | PASS | 45262.80 |
| ambiguous-03 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.52 |
| ambiguous-04 | none | PASS | PASS | PASS | PASS | PASS | PASS | 46259.35 |
| ambiguous-05 | TIMEOUT | FAIL | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | FAIL | 60002.69 |

Interpretation: verified evidence includes source-grounded review/unresolved records after rejecting model proposals; it does not repair model quotes or erase raw errors. Complete outcomes on gold unknown-input cases are correct abstentions, not completed work cards. Frozen unsupported-anchor metrics can flag benign wording (en-02 determiner difference); see MODEL_EVALUATION.md for human adjudication and constraint scope all versus * limitations.

See JSON for each original untrusted proposal, error, interception and draft candidate. No work was executed, no UI was changed and no failed output was confirmed. Safe review/block is not proof of recovered constraints. CPU observations do not establish W7900/Hailo/UGen300 performance.
