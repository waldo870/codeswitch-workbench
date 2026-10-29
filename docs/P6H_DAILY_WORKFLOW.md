# P6H Daily Workflow Planner

P6H is an offline planner over an existing saved P1 workspace and its validated P6G routine-handoff sidecar. It does not parse new tasks, change source cards, or execute work.

## Create and use a plan

1. Open the saved P1 workspace created by **Prepare metadata-preserving P1 handoff** in P6E.
2. In **Daily workflow planner**, choose a date and create a plan from linked routine metadata. Existing plan dates cannot be silently replaced.
3. Review **Today**, **Upcoming**, **Blocked** and **Completed**. Dependencies preserve the directed edge `dependent card -> prerequisite card`; a dependent remains blocked until its prerequisite is complete or explicitly carried as already satisfied.
4. Edit owner, due date, scheduled date, progress and notes. Owner/deadline edits are marked `user-edited`; the P6E source metadata and P1 evidence remain unchanged.
5. Save an end-of-day review and choose incomplete items for tomorrow's draft. Completed prerequisite IDs are retained as satisfied references; progress resets to `not_started` and no P1 confirmation is copied.

The collection is stored in the existing local IndexedDB extension store under P6H schema version 1. No localStorage data migration is needed. Invalid versions, wrong workspace IDs, altered evidence, broken card mappings, reversed dependencies and oversized records are rejected instead of being silently migrated.

## Encrypted exchange

The existing P6A exchange can optionally include a validated P6H plan collection, but only when its P6G routine sidecar is also opted in. Exchange creation validates it against the P1 workspace and evidence. Import requires separate user choices to preserve both sidecars, remaps the local collection workspace ID, and validates again. Existing P6H data is never overwritten; conflicting plan collections stop import for manual review. Imported P1 card confirmation is reset by P6A. The passphrase is not stored.

Encryption protects the exchange file; it does not authenticate a collaborator, provide network sync, or establish end-to-end device security. IndexedDB itself is local and unencrypted. No raw audio is included by P6H.

## Safety boundary

Planner completion is progress metadata only. It is not the P1 `confirmed` state and cannot authorize sending email, deployment, shell commands or any external action. Original constraints and evidence remain in the workspace and are displayed for review. Tomorrow plans are drafts, not scheduled calendar events.
