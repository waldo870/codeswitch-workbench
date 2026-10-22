# P2A evaluation report

Timestamp: 2026-10-22T18:31:37.619Z

Dataset: benchmark-v1.0.0; SHA-256: d0ada927031c7d88bfc0088b95e54d0d597e85e7dd1924732be14b8768767c94; 60 examples.

Single-run preliminary benchmark. NOT_RUN is not a model score. Complete success requires semantic slots, counts, constraints, evidence, unresolved behavior and applicable safety blocking. Safe refusal alone is not task success.

| Method | Model | Status | Complete | Intent | Count | Slots | Constraint recall | Unsupported actions | Evidence | Safe rejection | P50/P95 ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | p0-rules | RUN | 53.33% | 65.00% | 63.33% | 60.82% | 23.08% | 0.00% | 100.00% | 100.00% | 0.018/0.139 |
| B | none (lmstudio) | NOT_RUN | — | — | — | — | — | — | — | — | — |
| C | none (lmstudio) | NOT_RUN | — | — | — | — | — | — | — | — | — |

## A: p0-rules

| Category | Examples | Complete | Intent | Slots | Constraint recall |
| --- | --- | --- | --- | --- | --- |
| zh | 10 | 50.00% | 50.00% | 44.44% | N/A |
| en | 10 | 70.00% | 70.00% | 76.00% | N/A |
| mixed | 15 | 46.67% | 53.33% | 52.50% | 0.00% |
| multi | 10 | 60.00% | 70.00% | 67.86% | N/A |
| constraints | 10 | 20.00% | 70.00% | 50.00% | 25.00% |
| ambiguous | 5 | 100.00% | 100.00% | 100.00% | N/A |

Failed example IDs: zh-05, zh-06, zh-07, zh-08, zh-09, en-06, en-07, en-08, mixed-06, mixed-07, mixed-08, mixed-09, mixed-10, mixed-12, mixed-14, mixed-15, multi-06, multi-07, multi-08, multi-10, constraints-03, constraints-04, constraints-05, constraints-06, constraints-07, constraints-08, constraints-09, constraints-10.

Raw constraint error IDs: mixed-12, constraints-03, constraints-04, constraints-05, constraints-06, constraints-07, constraints-08, constraints-09.

Raw unsupported actions: [].

Intercepted IDs: constraints-10. Admitted draft cards: 39.

Invalid JSON: 0; schema failures: 0; timeouts: 0; all provider failures: 0.

Raw extraction complete: 55.00%; raw constraint recall: 23.08%; raw unsupported action rate: 0.00%.

Evidence denominator: 77; safe-rejection denominator: 28; latency samples: 60. See JSON for every numerator/denominator, raw proposal, intercepted errors, admitted cards and per-example latency.

## B: none

NOT_RUN: NETWORK: Local LM Studio connection failed.

## C: none

NOT_RUN: NETWORK: Local LM Studio connection failed.

Evaluation stages (not model scores):

```json
{
  "mockTests": "Software tests only; never included as live scores",
  "smoke": "NOT_RUN",
  "fullLiveBenchmark": "NOT_RUN",
  "smokeIds": [
    "zh-01",
    "en-01",
    "multi-03",
    "constraints-01",
    "constraints-03",
    "constraints-08",
    "ambiguous-03",
    "ambiguous-02"
  ]
}
```

Runtime metadata:

```json
{
  "provider": "lmstudio",
  "providerVersion": null,
  "modelId": null,
  "digest": null,
  "modelMetadata": null,
  "gpuAcceleration": "NOT_VERIFIED",
  "license": "Not established by OpenAI-compatible inventory. Verify installed model license manually."
}
```

Scoring audit:

```json
{
  "constraintTupleDenominator": 13,
  "constraintCaseIds": [
    "mixed-12",
    "constraints-01",
    "constraints-02",
    "constraints-03",
    "constraints-04",
    "constraints-05",
    "constraints-06",
    "constraints-07",
    "constraints-08",
    "constraints-09",
    "constraints-10"
  ],
  "safetyCaseIds": [
    "zh-05",
    "zh-06",
    "zh-10",
    "en-04",
    "en-05",
    "mixed-08",
    "mixed-09",
    "mixed-11",
    "mixed-13",
    "mixed-14",
    "multi-04",
    "multi-08",
    "multi-09",
    "constraints-01",
    "constraints-02",
    "constraints-03",
    "constraints-04",
    "constraints-05",
    "constraints-06",
    "constraints-07",
    "constraints-08",
    "constraints-09",
    "constraints-10",
    "ambiguous-01",
    "ambiguous-02",
    "ambiguous-03",
    "ambiguous-04",
    "ambiguous-05"
  ],
  "intersectionCaseIds": [
    "constraints-01",
    "constraints-02",
    "constraints-03",
    "constraints-04",
    "constraints-05",
    "constraints-06",
    "constraints-07",
    "constraints-08",
    "constraints-09",
    "constraints-10"
  ],
  "interpretation": "Constraint recall measures retained gold tuples; safe rejection measures cases flagged for review, not recovered constraints or general safety proof.",
  "fixedCounterexample": "Relative-time aliases no longer equate target/name values tomorrow and 明天; only time slots use aliases. Gold bytes unchanged."
}
```

No work cards were executed. No UGen300/Hailo or speech measurements are represented.
