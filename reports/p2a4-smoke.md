# P2A.4 live smoke revalidation

Model: gemma-3-4b-it. Dataset SHA-256: d0ada927031c7d88bfc0088b95e54d0d597e85e7dd1924732be14b8768767c94. Timestamp: 2026-10-27T22:45:55.549Z.

Provider/schema compatibility and semantic quality are reported separately. No prompt, gold, schema, timeout or model changes. Raw diagnostics are local-only and ignored by Git.

| Case | Provider | Schema | Evidence | Constraints | Semantics | Full | ms | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| zh-01 | true | true | true | false | false | false | 35775.2 | none |
| en-01 | true | true | true | false | false | false | 35355.7 | none |
| multi-03 | false | false | false | false | false | false | 60003.2 | TIMEOUT |
| constraints-01 | true | true | false | false | false | false | 36442.1 | none |
| constraints-03 | true | true | true | false | false | false | 37561.7 | none |
| constraints-08 | true | true | false | false | false | false | 38727.7 | none |
| ambiguous-03 | true | true | true | false | false | false | 39736.6 | none |
| ambiguous-02 | true | true | true | false | false | false | 42960.0 | none |

Counts: {"providerPass":7,"schemaPass":7,"evidencePass":5,"constraintPass":0,"semanticPass":0,"fullPass":0}.

Timeout: TIMEOUT_UNRESOLVED. Full benchmark: NOT_RUN. No model or hardware acceleration claim follows from software tests.

## Runtime and timeout evidence

Gemma 3 4B Q8_0 was already loaded and IDLE before the run (8192 context). lms CLI commit: 69d945a. No reload/switch/download occurred. GPU acceleration is not verified.

Seven LM Studio statistics events matched the completed responses by prompt/completion token counts and sequence. Observed tokens/s: 6.315–6.364; time to first token: 9.984–10.097 seconds. Completed model times: 35.331–42.937 seconds.

Multi-03 aborted at 60003.229 ms with the unchanged 60000 ms timeout. It returned no HTTP envelope or completed inference statistics. No retry was made. TIMEOUT_UNRESOLVED: slow generation is observed, but model loading/queueing versus generation time cannot be fully attributed for the aborted request.

MODEL_QUALITY_FAILURE: all seven completed outputs added an extra required constraint. The three restriction examples retained 0/4 expected Gold tuples. Deployment and publish cases fabricated evidence; ambiguous input invented a task. The independent verifier admitted zero draft cards. No 60-case inference was run.
