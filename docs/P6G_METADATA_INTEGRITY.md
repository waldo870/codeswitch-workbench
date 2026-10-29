# P6G Metadata Integrity

## Contract

`src/web/p6g/routine-handoff.ts` defines `codeswitch-routine-handoff` schema version 1. It is a sidecar keyed in the local IndexedDB extension store and optionally embedded inside the authenticated P6A encrypted payload. It never extends or rewrites a P1 Work Card.

Each sidecar maps a P6E routine card ID to exactly one P1 card ID and includes the source title plus assignee, ISO calendar date deadline, priority, description, and directed dependency edges. An edge is explicitly represented as `dependentRoutineCardId -> prerequisiteRoutineCardId`. Missing, ambiguous, cyclic, self-referential, or non-matching prerequisites block handoff. P1 card evidence must still exactly match the original input slice and source title.

The sidecar is schema-versioned, size-limited by the extension store, revalidated when encrypted exchanges are created and decrypted, and revalidated again against the receiving P1 Workspace before it is stored. Unknown fields, unknown schema versions, owner mismatch, changed evidence, invalid mappings, and unsupported prerequisites fail closed. P6A exchange schema version remains 1; absence of the optional sidecar is backward compatible with older exchanges.

## Confirmation and import semantics

The metadata contract has no confirmation or approval field. Imported Workspaces use the existing import path, which resets cards to draft. The user must explicitly opt in to preserve a received sidecar before applying the exchange. Metadata that cannot be represented or validated is not silently dropped: handoff creation or import is blocked with a reason. P1 evidence, constraints, transcript provenance, and source text are not modified.

The routine-to-P1 conversion is only offered when every active routine title can be parsed and validated with source-grounded evidence. It opens a separate local draft Workspace. It does not auto-run, confirm, export, email, deploy, or modify external systems.

## Limits

This protects integrity within an encrypted exchange and checks local mapping consistency. It does not authenticate collaborators, prove who created a sidecar, encrypt IndexedDB at rest, guarantee endpoint security, or constitute end-to-end security certification. A collaborator name remains an unverified label. The routine source itself is not cryptographically signed; the encrypted exchange authenticates the payload to a holder of the passphrase.
