# P6F Workflow Efficiency Evaluation

Status: **HUMAN_EVALUATION_NOT_RUN**

This report compares manual card creation, routine templates, confirmed speech transcripts, and encrypted collaboration. Automated test durations and operation counts are never presented as human workflow measurements.

Generated: 2026-10-29T20:31:55.250Z

| Method | Human observations | Duration median / P95 (ms) | Mean operations | Mean corrections | Complete cards | Constraints preserved | Conflicts | Tasks completed |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| manual | 0 | NOT_RUN / NOT_RUN | NOT_RUN | NOT_RUN | 0/0 | 0/0 | NOT_RUN | 0/0 |
| routine-template | 0 | NOT_RUN / NOT_RUN | NOT_RUN | NOT_RUN | 0/0 | 0/0 | NOT_RUN | 0/0 |
| speech-transcript | 0 | NOT_RUN / NOT_RUN | NOT_RUN | NOT_RUN | 0/0 | 0/0 | NOT_RUN | 0/0 |
| encrypted-collaboration | 0 | NOT_RUN / NOT_RUN | NOT_RUN | NOT_RUN | 0/0 | 0/0 | NOT_RUN | 0/0 |

## Interpretation

No real participant observations have been supplied. Empty denominators are not zero scores; they mean not measured. Automated tests establish only that the evaluation code validates and summarizes evidence correctly.

## Versioned scenarios

- **p6f-manual-01 — Manual multi-card creation:** Create a small set of work cards from a supplied mixed-language instruction and preserve all stated constraints. Completion: Cards have required fields, source review is complete, and each card remains human-confirmed only by an explicit user action.
- **p6f-template-01 — Routine template workflow:** Start from a relevant routine template, tailor its cards, and review them. Completion: Required cards and prerequisites are reviewed; no external action is executed.
- **p6f-speech-01 — Confirmed speech transcript workflow:** Use a provided transcript, correct it if needed, confirm the transcript, then analyze and review cards. Completion: Transcript confirmation precedes parsing and all expected card evidence is reviewed.
- **p6f-collaboration-01 — Encrypted collaborator exchange:** Export an encrypted request, exchange it with a collaborator, import a reply, and resolve any conflicts. Completion: Exchange is decrypted, provenance reviewed, conflicts explicitly resolved, and imported confirmations are not trusted.
