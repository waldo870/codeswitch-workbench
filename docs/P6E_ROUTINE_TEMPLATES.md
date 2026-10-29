# P6E Routine Templates

P6E adds an offline routine-template area to each open workspace. It starts with five original templates: Daily Work Checklist, Meeting Follow-up, Shift Handover, Customer Follow-up, and Software Testing / Release Review. Users can add and remove templates, edit their item titles, and create routine runs. Editing a template creates a new version and preserves the preceding item list in local version history.

Routine runs use a separate `RoutineDraftCard` model. Items support a responsible person, date-only deadline, priority, prerequisites, status, and template provenance. They are drafts by default. A user's explicit confirmation records review of that routine item; it does not execute it, and it does not create a P1 confirmed work card. Editing a confirmed item returns it to draft. There is no shell, email, deployment, or external-system integration.

Routine data is saved under the IndexedDB extension namespace `p6e.routine-templates`, keyed by the current workspace ID. No network service is used. The extension store applies its existing 1 MB per-key limit. Export produces a `codeswitch-routine-drafts` JSON file. Import validates schema and workspace association, requires user confirmation in the UI, adds templates/runs without replacing current data, and resets imported item states to draft.

## P1 Parser Boundary

Template text is user-authored and has no original utterance evidence. P6E never manufactures P1 evidence spans or changes P1 constraints. “Preview deterministic conversion” passes the current template item titles to the existing P0 parser and displays only parser-produced cards with parser evidence. Unrecognized text remains visible as unresolved. The preview does not modify the workspace or promote routine items into executable work cards.

## Limitations

- Template content is stored per open workspace; a workspace must exist first.
- The UI edits the item title list; descriptions and prerequisites remain attached to item positions and can be adjusted on generated run cards.
- The conversion preview is deliberately read-only. Copy an intended instruction into the normal P1 input flow and review its evidence/constraints there.
- IndexedDB persistence is local and is not represented as encrypted.
- Routine JSON import/export is separate from the encrypted P6A collaboration envelope; P6E does not silently add routines to that envelope.
