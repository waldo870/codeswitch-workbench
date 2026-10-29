# P6G Human Evaluation Procedure

## Status

No participant result is supplied by this guide. Unless actual observations have been collected through the workspace's **Workflow time-to-value study** panel, status is `HUMAN_EVALUATION_NOT_RUN`. Do not use a developer or automated browser test as a participant.

## Four fixed scenarios

Use the versioned scenario briefs in `src/evaluation/p6g-evaluation.ts` without changing expected card or constraint denominators:

- Daily checklist
- Meeting follow-up
- Shift handover
- Software release review

Compare each scenario with the same participant across Manual cards, Routine template, and Encrypted collaboration. Counterbalance method order where practical and record the order in facilitator notes outside the metrics form. Do not coach one method more than another.

## Timing and observation

For each scenario/method pair, show the exact fixed scenario brief and its method-specific completion boundary. Start when the facilitator clicks **Start participant workflow** after handing over the brief. Stop when the participant reaches the boundary and the facilitator clicks **Finish timing**. The instrument uses a monotonic clock for elapsed duration and separately records wall-clock timestamps.

The facilitator records observed operation count, manual corrections, valid cards, missed constraints, handoff conflicts, confirmations and whether the boundary was reached. Use a pseudonymous participant code only; never enter a real name. A participant can leave the optional code blank. Do not require negative feedback to continue using CodeSwitch.

The panel saves to the active workspace's local IndexedDB, supports review/deletion after confirmation, and explicitly exports JSON. It does not upload data. Values are participant/facilitator observations, not independently audited facts. Do not claim a defect from a single subjective comment.

## Result reporting

Run `pnpm benchmark:p6g` to generate the fixed-protocol report. With no valid human observations, the report must remain `HUMAN_EVALUATION_NOT_RUN`; automation timing is never substituted. If observations are collected, use the documented input schema and preserve scenario/method denominators. Report missing measures as unavailable rather than guessing. Store the report only after checking it for personal information.
