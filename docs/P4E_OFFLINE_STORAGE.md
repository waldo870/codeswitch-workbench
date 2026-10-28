# P4E — Offline Workspace Persistence

## Storage model

The browser UI uses IndexedDB database `codeswitch-workbench` (database version 1):

- `workspaces`: one validated record per saved work session.
- `meta`: the current speech review draft and small migration metadata.

The record envelope contains a workspace ID, record schema version, created/updated timestamps, Workspace v1, audio metadata, ASR metadata, raw transcript, transcript corrections, constraints, and export history. Audio metadata includes the source SHA-256 and WAV properties; **audio bytes are never stored**. Runtime mode is preserved as `live`, `mock`, or `unknown`; unknown legacy metadata is not upgraded to a Live claim. Mock results are labelled in the UI and retain their mock provenance.

Workspace v1 continues to carry the original utterance, parser output, UTF-16 evidence, constraints, card states, edits and revision-bound confirmations. Transcript corrections are separate from the raw ASR transcript. A user-edited transcript is marked as such; it does not rewrite the raw recognition result.

## Save, open, delete

Analyzed work and subsequent card edits/reviews are saved to the active session. The UI reports saving, saved, or failed state. A failed write remains only in memory, is not called saved, and blocks confirmation/export while persistence is unavailable. While workspace or transcript persistence is saving or has failed, the page installs a `beforeunload` warning so reload/close does not silently discard pending in-memory changes. Wait for the explicit saved state before intentionally reloading. New Workspace starts a distinct session; the session list can reopen any validated record. Deleting one session requires a second confirmation. Clear Local Data separately requires confirmation and removes all app records and legacy payloads.

IndexedDB writes are serialized within the repository instance. Cross-tab concurrency is not coordinated; do not edit the same session in multiple tabs. Browser quota, private-browsing restrictions, user clearing, or profile removal can make local data unavailable. There is no encryption or cloud backup.

## JSON backup and restore

Complete Workspace JSON export is a user-triggered local download and includes provenance, evidence, constraints, card state/history and export metadata. It does not include audio bytes and does not execute cards. Import is limited to 4 MB, validates the closed schema and reconstructs parser/evidence provenance. It always creates a new workspace ID and never overwrites an existing record. Imported confirmation events are discarded; card edits and rejections are replayed, then the user must review and confirm again. Invalid bundles are rejected before writing.

The separate confirmed-workcard export still contains only confirmed cards and is subject to the P0/P1 validator. Workspace JSON is a backup format, not proof of identity or a cryptographic audit.

## Legacy migration

On first open, the app checks the P1 key `codeswitch-workbench.workspace.v1` and speech review key. It parses and validates the complete legacy payload before writing. The migration marker and removal of source keys happen only after successful IndexedDB persistence. Invalid/incompatible legacy data is retained and an error is shown; the user can inspect/retry or explicitly clear local data. Evidence and constraints are revalidated and retained during migration.

## Browser shell cache

Production builds generate a versioned same-origin precache list for the application shell and bundled JS/CSS/fonts. The service worker caches same-origin GETs only, does not intercept `/api/`, and does not cache ASR/model responses. A successful first online load is required before offline reopening is available. A later build creates a new cache version and removes prior shell versions on activation.

## Privacy boundary

All data stays in the current browser origin. There is no analytics, server database, cloud synchronization, API key storage, automatic email/calendar action, or automatic work execution. Same-origin script access and browser-profile access are within the local trust boundary. Use a dedicated local browser profile/origin for sensitive work and review exports before sharing.
