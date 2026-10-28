# P2.5 fixed-prompt research

Timestamp: 2026-10-28T03:23:41.956Z

Runtime metadata (see p2-windows-runtime.json for runtime observations): {"model":"gemma-3-27b-it","provider":"lmstudio","runtimeLocation":"windows-wsl-gateway","gpu":"VERIFIED_GPU_PARTICIPATION","quantization":"Q8_0","backend":"Windows Vulkan AVX2 2.65.1","providerVersion":"LM Studio 0.4.26.0","fullLayerOffload":"NOT_VERIFIED","evidenceFile":"p2-windows-runtime.json"}

Dataset: d0ada927031c7d88bfc0088b95e54d0d597e85e7dd1924732be14b8768767c94; 60 frozen cases.

Attempted: 60/60; schema-valid completed outputs: 60; status: DATASET_COMPLETE. Product admission: false.

Timeouts: 0; schema failures: 0; invalid JSON: 0.

Provider failures are non-semantic outcomes. B/C percentages below condition on valid completed outputs; compare coverage before interpreting them. No timeout is silently counted as a semantic mistake or constraint omission. Complete/60 operational yield is distinct from conditional semantic accuracy.

| Pipeline | Coverage | Complete | Intent | Count | Slots | Constraints | Unsupported actions | Evidence | Safe review/block | Completed P50/P95 ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A deterministic | 60/60 | 32/60 (53.33%) | 39/60 (65.00%) | 38/60 (63.33%) | 104/171 (60.82%) | 3/13 (23.08%) | 0/39 (0.00%) | 77/77 (100.00%) | 28/28 (100.00%) | 0.02/0.16 |
| B local LLM + schema | 60/60 | 20/60 (33.33%) | 51/60 (85.00%) | 50/60 (83.33%) | 138/171 (80.70%) | 4/13 (30.77%) | 35/75 (46.67%) | 96/99 (96.97%) | 17/28 (60.71%) | 7298.75/14800.46 |
| C independent verification | 60/60 | 16/60 (26.67%) | 21/60 (35.00%) | 22/60 (36.67%) | 27/171 (15.79%) | 4/13 (30.77%) | 2/14 (14.29%) | 64/64 (100.00%) | 27/28 (96.43%) | 7298.86/14800.60 |

| Category | Attempted | Valid completed | Complete/valid | Gold constraints recovered/assessed |
| --- | --- | --- | --- | --- |
| zh | 10 | 10 | 0/10 (0.00%) | NOT_EVALUABLE (0 eligible observations) |
| en | 10 | 10 | 5/10 (50.00%) | NOT_EVALUABLE (0 eligible observations) |
| mixed | 15 | 15 | 9/15 (60.00%) | 0/1 (0.00%) |
| multi | 10 | 10 | 6/10 (60.00%) | NOT_EVALUABLE (0 eligible observations) |
| constraints | 10 | 10 | 0/10 (0.00%) | 4/12 (33.33%) |
| ambiguous | 5 | 5 | 0/5 (0.00%) | NOT_EVALUABLE (0 eligible observations) |

All-attempt latency P50/P95 (includes timeouts): 7298.75/14800.46 ms.

Gemma 4B historical strict smoke: 0/8 Full Smoke; its 60-case benchmark was NOT_RUN. It is not a comparable 60-case score.

| Case | Provider error | Provider | Schema | Evidence | Constraint | Semantic | Full | Latency ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| zh-01 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 6094.83 |
| zh-02 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 6485.00 |
| zh-03 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 7078.53 |
| zh-04 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 6425.68 |
| zh-05 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 7583.66 |
| zh-06 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 14114.44 |
| zh-07 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 6820.30 |
| zh-08 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 7298.75 |
| zh-09 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 6772.60 |
| zh-10 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 10515.18 |
| en-01 | none | PASS | PASS | PASS | PASS | PASS | PASS | 6019.93 |
| en-02 | none | PASS | PASS | PASS | PASS | PASS | PASS | 6243.10 |
| en-03 | none | PASS | PASS | PASS | PASS | PASS | PASS | 6917.30 |
| en-04 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 10406.66 |
| en-05 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 6467.81 |
| en-06 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 6514.46 |
| en-07 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 5077.47 |
| en-08 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 6652.24 |
| en-09 | none | PASS | PASS | PASS | PASS | PASS | PASS | 6410.74 |
| en-10 | none | PASS | PASS | PASS | PASS | PASS | PASS | 6364.94 |
| mixed-01 | none | PASS | PASS | PASS | PASS | PASS | PASS | 6436.73 |
| mixed-02 | none | PASS | PASS | PASS | PASS | PASS | PASS | 6372.98 |
| mixed-03 | none | PASS | PASS | PASS | PASS | PASS | PASS | 6989.06 |
| mixed-04 | none | PASS | PASS | PASS | PASS | PASS | PASS | 6319.85 |
| mixed-05 | none | PASS | PASS | PASS | PASS | PASS | PASS | 6532.06 |
| mixed-06 | none | PASS | PASS | PASS | PASS | PASS | PASS | 6640.86 |
| mixed-07 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 6505.10 |
| mixed-08 | none | PASS | PASS | PASS | PASS | PASS | PASS | 7086.09 |
| mixed-09 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 9413.31 |
| mixed-10 | none | PASS | PASS | PASS | PASS | PASS | PASS | 6622.07 |
| mixed-11 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 8410.67 |
| mixed-12 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 10381.03 |
| mixed-13 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 11039.87 |
| mixed-14 | none | PASS | PASS | PASS | PASS | PASS | PASS | 6996.73 |
| mixed-15 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 6761.57 |
| multi-01 | none | PASS | PASS | PASS | PASS | PASS | PASS | 10145.58 |
| multi-02 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 10169.62 |
| multi-03 | none | PASS | PASS | PASS | PASS | PASS | PASS | 10946.77 |
| multi-04 | none | PASS | PASS | PASS | PASS | PASS | PASS | 11902.64 |
| multi-05 | none | PASS | PASS | PASS | PASS | PASS | PASS | 10306.36 |
| multi-06 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 10503.54 |
| multi-07 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 10680.95 |
| multi-08 | none | PASS | PASS | PASS | PASS | PASS | PASS | 13981.55 |
| multi-09 | none | PASS | PASS | PASS | PASS | PASS | PASS | 15455.45 |
| multi-10 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 15072.63 |
| constraints-01 | none | PASS | PASS | FAIL | FAIL | FAIL | FAIL | 14800.46 |
| constraints-02 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 9811.85 |
| constraints-03 | none | PASS | PASS | PASS | PASS | PASS | PASS | 9231.64 |
| constraints-04 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 12745.25 |
| constraints-05 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 9235.21 |
| constraints-06 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 9469.00 |
| constraints-07 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 6677.96 |
| constraints-08 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 9696.07 |
| constraints-09 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 13011.24 |
| constraints-10 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 16959.04 |
| ambiguous-01 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 6581.47 |
| ambiguous-02 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 6029.33 |
| ambiguous-03 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 8878.05 |
| ambiguous-04 | none | PASS | PASS | PASS | FAIL | FAIL | FAIL | 7569.44 |
| ambiguous-05 | none | PASS | PASS | PASS | PASS | FAIL | FAIL | 8937.26 |

Interpretation: verified evidence includes source-grounded review/unresolved records after rejecting model proposals; it does not repair model quotes or erase raw errors. Complete outcomes on gold unknown-input cases are correct abstentions, not completed work cards. Frozen unsupported-anchor metrics can flag benign wording (en-02 determiner difference); see MODEL_EVALUATION.md for human adjudication and constraint scope all versus * limitations.

See JSON for each original untrusted proposal, error, interception and draft candidate. No work was executed, no UI was changed and no failed output was confirmed. Safe review/block is not proof of recovered constraints. Consult the matching runtime evidence for GPU participation; host measurements do not establish Hailo/UGen300 performance.
