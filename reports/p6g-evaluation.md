# P6G Workflow Time-to-Value Evaluation

Status: **HUMAN_EVALUATION_NOT_RUN**

Generated: 2026-10-29T21:17:56.679Z

No automated test or script duration is used as a human workflow measurement. Empty metrics are NOT_RUN, not zero.

## Daily checklist (daily-checklist)

Prepare three cards: review today’s support queue; check sandbox credentials; send the daily status summary. Review each card before marking it confirmed or rejected.

Method-specific completion boundaries:
- manual: All three expected checklist cards are reviewed and explicitly confirmed or rejected; no external work is executed.
- routine-template: Create a run from Daily Work Checklist, review all three cards and metadata, then explicitly confirm or reject each item; no external work is executed.
- encrypted-collaboration: Complete the reviewed encrypted request/import/reply/merge round trip in a second local browser profile; review all three cards and the final assignment state; no external work is executed.

| Method | Human observations | Duration P50/P95 ms | Mean operations | Mean corrections | Valid cards | Missed constraints | Handoff conflicts | Mean confirmations | Completed workflows |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| manual | 0 | NOT_RUN / NOT_RUN | NOT_RUN | NOT_RUN | 0/0 | 0/0 | NOT_RUN | NOT_RUN | 0/0 |
| routine-template | 0 | NOT_RUN / NOT_RUN | NOT_RUN | NOT_RUN | 0/0 | 0/0 | NOT_RUN | NOT_RUN | 0/0 |
| encrypted-collaboration | 0 | NOT_RUN / NOT_RUN | NOT_RUN | NOT_RUN | 0/0 | 0/0 | NOT_RUN | NOT_RUN | 0/0 |

## Meeting follow-up (meeting-follow-up)

After the vendor meeting, prepare a card to summarize decisions, a task to confirm the renewal date, and an English follow-up email draft to Alex. Do not send the email.

Method-specific completion boundaries:
- manual: Review all three cards and the no-send restriction; keep the email as a draft and explicitly confirm or reject each card.
- routine-template: Create a Meeting Follow-up run, review cards and metadata, preserve the no-send restriction, then explicitly confirm or reject each routine item.
- encrypted-collaboration: Complete the reviewed encrypted request/import/reply/merge round trip in a second local browser profile; review all cards and verify the email remains a draft and unsent.

| Method | Human observations | Duration P50/P95 ms | Mean operations | Mean corrections | Valid cards | Missed constraints | Handoff conflicts | Mean confirmations | Completed workflows |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| manual | 0 | NOT_RUN / NOT_RUN | NOT_RUN | NOT_RUN | 0/0 | 0/0 | NOT_RUN | NOT_RUN | 0/0 |
| routine-template | 0 | NOT_RUN / NOT_RUN | NOT_RUN | NOT_RUN | 0/0 | 0/0 | NOT_RUN | NOT_RUN | 0/0 |
| encrypted-collaboration | 0 | NOT_RUN / NOT_RUN | NOT_RUN | NOT_RUN | 0/0 | 0/0 | NOT_RUN | NOT_RUN | 0/0 |

## Shift handover (shift-handover)

Prepare a handover card to review the overnight queue, a card to check access logs, and a card to close the incident after the access logs are checked. Do not grant production access.

Method-specific completion boundaries:
- manual: Review all three cards, preserve the do-not-grant-production-access restriction and the prerequisite direction, then explicitly confirm or reject each card.
- routine-template: Create a Shift Handover run, review all three cards, metadata and prerequisite direction, then explicitly confirm or reject each routine item.
- encrypted-collaboration: Complete the reviewed encrypted request/import/reply/merge round trip in a second local browser profile; verify the prerequisite direction and access restriction remain unchanged.

| Method | Human observations | Duration P50/P95 ms | Mean operations | Mean corrections | Valid cards | Missed constraints | Handoff conflicts | Mean confirmations | Completed workflows |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| manual | 0 | NOT_RUN / NOT_RUN | NOT_RUN | NOT_RUN | 0/0 | 0/0 | NOT_RUN | NOT_RUN | 0/0 |
| routine-template | 0 | NOT_RUN / NOT_RUN | NOT_RUN | NOT_RUN | 0/0 | 0/0 | NOT_RUN | NOT_RUN | 0/0 |
| encrypted-collaboration | 0 | NOT_RUN / NOT_RUN | NOT_RUN | NOT_RUN | 0/0 | 0/0 | NOT_RUN | NOT_RUN | 0/0 |

## Software release review (software-release-review)

Prepare a card to run the release test suite, a card to review the changelog, and a task to request release approval. Do not deploy to production.

Method-specific completion boundaries:
- manual: Review all cards and preserve the production prohibition, then explicitly confirm or reject each card; do not deploy.
- routine-template: Create a Software Testing / Release Review run, review cards and metadata, preserve the production prohibition, then confirm or reject routine items.
- encrypted-collaboration: Complete the reviewed encrypted request/import/reply/merge round trip in a second local browser profile; recheck that no deployment action or confirmation was inherited.

| Method | Human observations | Duration P50/P95 ms | Mean operations | Mean corrections | Valid cards | Missed constraints | Handoff conflicts | Mean confirmations | Completed workflows |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| manual | 0 | NOT_RUN / NOT_RUN | NOT_RUN | NOT_RUN | 0/0 | 0/0 | NOT_RUN | NOT_RUN | 0/0 |
| routine-template | 0 | NOT_RUN / NOT_RUN | NOT_RUN | NOT_RUN | 0/0 | 0/0 | NOT_RUN | NOT_RUN | 0/0 |
| encrypted-collaboration | 0 | NOT_RUN / NOT_RUN | NOT_RUN | NOT_RUN | 0/0 | 0/0 | NOT_RUN | NOT_RUN | 0/0 |

## Interpretation

A workflow is complete only when the observer records that the fixed completion boundary was reached. Card counts and missed-constraint counts retain explicit denominators. No human observations have been collected unless an observation record is present.
