# P4G — Privacy and Data Handling

## Local-only storage

Feedback, proposals, improvement sessions, source references and edit/status history are stored in the same browser-origin IndexedDB Workspace record as the related work session. They are included in complete Workspace JSON downloads only after the user requests that export. P4G does not send data to a cloud, analytics service, LM Studio, GitHub, email/calendar, or any external work tool.

Feedback can include private user text. Users should avoid entering passwords, API keys, tokens, personal secrets or unrelated sensitive material. Browser IndexedDB is not encrypted and is accessible to the browser profile and same-origin scripts. No server backup, account sync, or remote feedback collection exists.

Audio bytes are never stored. An optional audio SHA-256, card evidence, provider/model/runtime, and raw/corrected transcript context already associated with the Workspace may be referenced. Complete Workspace JSON can contain the original utterance, transcript and feedback text; inspect it before sharing.

## Validation and provenance

Feedback schema and category/rating are validated before persistence. Workspace/session IDs must match the containing row. Related cards must exist in that workspace. Evidence spans must slice the immutable original input exactly and match an original card/constraint source span (or the complete source utterance when no card is selected). Audio/provider metadata, when present, must agree with the linked speech provenance. Tampered or unsupported records are reported and left stored but excluded from normal session loading; the app does not silently repair them.

Proposal source references must remain within the validated feedback/workspace. Imported data is parsed under a versioned closed schema and cannot overwrite local records. Old approved/rejected/resolved lifecycle status is reset to draft on import; work-card confirmation is likewise invalidated. Previous user-entered history remains provenance and includes the import reset event.

## Retention and deletion

Users can edit or explicitly delete an individual feedback item after a second confirmation. Deleting a feedback item removes its linked proposal/session from this browser; work cards and evidence are retained. **Clear Local Data** removes all workspaces and feedback in the browser after confirmation. Browser profile clearing also removes data. There is no deletion request to send elsewhere.

## Status is not verification

Feedback represents a report, not a confirmed defect. Generated proposals are deterministic suggestions, not model output or a diagnosis. Approval only authorizes tracking. Session `resolved` and user-provided test notes do not certify a code change or a passing test. The app never runs tests, code, shell commands, GitHub operations or external actions from feedback.
