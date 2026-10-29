# P6E Routine Templates

P6E adds an offline routine-template area to each open workspace. It starts with five original templates: Daily Work Checklist, Meeting Follow-up, Shift Handover, Customer Follow-up, and Software Testing / Release Review. Users can add and remove templates, edit their item titles, and create routine runs. Editing a template creates a new version and preserves the preceding item list in local version history.

Routine runs use a separate `RoutineDraftCard` model. Items support a responsible person, date-only deadline, priority, prerequisites, status, and template provenance. They are drafts by default. A user's explicit confirmation records review of that routine item; it does not execute it, and it does not create a P1 confirmed work card. Editing a confirmed item returns it to draft. There is no shell, email, deployment, or external-system integration.

Routine data is saved under the IndexedDB extension namespace `p6e.routine-templates`, keyed by the current workspace ID. No network service is used. The extension store applies its existing 1 MB per-key limit. Export produces a `codeswitch-routine-drafts` JSON file. Import validates schema and workspace association, requires user confirmation in the UI, adds templates/runs without replacing current data, and resets imported item states to draft.

## P1 Parser Boundary

Template text is user-authored and has no original utterance evidence. P6E never manufactures P1 evidence spans or changes P1 constraints. “Preview deterministic conversion” passes the current template item titles to the existing P0 parser and displays only parser-produced cards with parser evidence. Unrecognized text remains visible as unresolved.

Each routine run also has an optional **Prepare P1 Workspace for encrypted collaboration** bridge. It submits the run's non-rejected item titles, unchanged and newline-separated, to the existing deterministic parser and independent validator. P6E blocks conversion unless every intended item becomes exactly one supported card, all source segments reconcile, evidence slices match, and P1 validation passes. After displaying the exact source and metadata omissions, the user explicitly approves creation. P6E saves a new ordinary Workspace record and downloads its normal Workspace JSON bundle; the user can open/import that bundle and then use the existing P6A Collaboration panel to create an encrypted request or reply. P6E does not change the P6A exchange envelope.

All converted P1 cards remain `draft` and require a fresh P1 confirmation. P6E routine `confirmed` status is never transferred. Responsible person, deadline, priority, description, and prerequisites are not represented by the current P1 Work Card schema and are explicitly omitted; they are not silently encoded into evidence or constraints. Rejected routine items are excluded, and unresolved or unsupported active items block the entire conversion so a partial result is not presented as complete.

## Limitations

- Template content is stored per open workspace; a workspace must exist first.
- The UI edits the item title list; descriptions and prerequisites remain attached to item positions and can be adjusted on generated run cards.
- The P1 bridge only accepts the current deterministic parser's narrow supported grammar. Unsupported routine language must be clarified by editing the routine item before conversion.
- The P1 bridge produces a standard Workspace JSON bundle, not an encrypted exchange file. Import/open it and use P6A to perform the encrypted request/reply exchange.
- IndexedDB persistence is local and is not represented as encrypted.
- Routine JSON import/export is separate from the encrypted P6A collaboration envelope; P6E does not silently add routines to that envelope.
