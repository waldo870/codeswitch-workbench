# P6F Workflow Efficiency Evaluation

P6F defines a versioned, reproducible human workflow evaluation for four paths: manually creating multiple cards, using a routine template, using a confirmed speech transcript, and exchanging encrypted collaboration files with a collaborator.

## Protocol

The versioned scenarios and completion rules live in `src/evaluation/p6f-workflow.ts`. A future observation file must contain observations tied to those scenario IDs, with human observation provenance, timestamps, operation counts, correction counts, expected/complete cards, expected/preserved constraints, conflict counts, and expected/completed tasks. The evaluator validates the scenario pairing, timestamp order and metric bounds before producing per-method numerator/denominator metrics.

For consistent human sessions, start timing after the participant has read the task brief and is ready to begin; stop after all expected cards have been reviewed and applicable constraints checked. For collaboration, include the request/reply exchange, reply review, and conflict choices. Count an operation as one deliberate participant input, selection, or action that changes workflow state; exclude passive rendering, autosave, and background processing. Count a manual correction when the participant edits transcript/card content after its initial entry or analysis. The same observer rubric and task-card/constraint checklist must be applied across all methods.

Run `pnpm benchmark:p6f` to emit a report with no human observations, or `pnpm benchmark:p6f -- path/to/human-observations.json` to evaluate an explicitly supplied local observation file. The input path is read locally and is not uploaded. Do not put identifying participant information in notes. Human timings must be measured during a human session; test automation durations are rejected as a source and never enter those measurements.

## Measures

- Completion time: elapsed wall-clock time for a human observation; report median and P95 per method.
- User operation count and manual correction count: recorded by the observer using the same event-counting rubric across all methods.
- Complete card success: complete cards / expected cards.
- Constraint preservation: preserved expected constraints / expected constraints.
- Collaboration conflict count: conflicts observed per recorded collaboration session.
- Task completion: completed tasks / expected tasks.

Zero denominators remain `0/0`, not a success or failure rate. With no human records, metrics are `NOT_RUN` (`null` in JSON) and the report status is `HUMAN_EVALUATION_NOT_RUN`. A local fixture or automated test is not a participant study. No human evaluation has been performed as part of this implementation.

## Limitations

This is an evaluation contract and report generator, not evidence of product efficiency. The P6D translation and P6E routine workflow are not included as measures beyond their specified paths. Speech conditions depend on the previously confirmed transcript workflow and do not claim speech recognition accuracy. Collaboration observations must include manually reviewed conflicts and may not count imported confirmation as complete. No external work is executed.
