# P4G — Feedback to Improvement Workflow

## Meaning of each stage

1. **Feedback** is an individual's report about a saved workspace. It is subjective input, not a verified defect, reproducible bug, model-quality measurement, or authorization to change software.
2. **Improvement proposal** is deterministic, editable text derived from the feedback category, rating, and supported patterns. The proposal keeps a source reference and remains `draft` until a person reviews it.
3. **Approval** is an explicit user decision. Approving changes the proposal to `approved` and starts a linked Improvement Session. Rejecting records `rejected`; neither decision runs code or creates a GitHub issue.
4. **Improvement Session** tracks a manually managed status: `draft`, `approved`, `in_progress`, `testing`, `resolved`, `reopened`, or `rejected`. Status history records the user transition and optional note.

## Giving feedback

Open a saved work session, then use **Give Feedback**. Choose Good, Needs Work, or Incorrect; select one of the supported categories; optionally describe what happened and what was expected; and optionally select related cards. Description and negative-reason fields are optional. Closing the form or leaving feedback empty does not restrict the normal workflow.

Feedback is associated with the workspace/session ID. It records source UTF-16 evidence, selected card IDs, optional audio SHA-256, and provider/model/runtime/mode metadata from the linked workspace. Edits append field history. A user can delete feedback after a second confirmation; linked proposal/session rows are removed while work cards and source provenance remain unchanged.

## Deterministic proposals

The first classifier uses category-specific review templates. A narrow pattern for speech-recognition feedback mentioning negated actions such as “don't deploy” produces a suggestion to investigate preservation of negative instructions. It does not claim the ASR omitted a phrase unless the user reported that, does not manufacture reproduction steps, and does not claim a regression test exists.

Generated title, problem statement, expected behavior, criteria and priority can be edited while the proposal remains draft. A bad rating defaults to high priority, mixed to medium, and good to low; the user can change it. Approval/rejection requires an explicit click after changes are saved.

## Improvement tracking

An approved session can move through supported lifecycle transitions. It retains source references and transition history. User-entered test notes carry the explicit label **user-reported — not verified**. `resolved` is a tracking status, not evidence of a passing test, accepted release, or completed code fix. The product does not edit source code, execute shell commands, call GitHub, create Issues, publish, send email, or update calendars.

## Export/import

Complete Workspace JSON v2 includes feedback, proposals, improvement sessions and histories alongside cards/evidence/constraints. Workspace v1 JSON remains importable with empty P4G collections. Import creates a new local record and revalidates source evidence; old work-card confirmations and P4G approval/resolution state are not trusted. P4G data is not included in the confirmed-workcard-only export.
