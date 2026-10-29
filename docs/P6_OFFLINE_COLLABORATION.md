# P6 Offline Collaboration

## Scope

P6A/P6B provide a file-based, offline exchange flow. A workspace owner creates a passphrase-protected request file, transfers it by a channel they choose, and the collaborator imports it into a **new** local workspace. The collaborator can assign cards, record status/results/notes and history, then export a reply. The owner decrypts and reviews the reply before applying it. No server, account, network service, shell, email, calendar, deployment or external tool is used.

The UI labels are local labels only. They do not authenticate a person, device or organization. Exchange encryption protects the file when stored or transferred, but does not establish end-to-end identity, secure passphrase delivery, endpoint integrity, or protection from a compromised browser/device.

## P4G review backlog

`reports/p4g-review-backlog-v1.json` consolidates 16 Live ASR observations and 12 Synthetic P5D safety observations. It records the original sample/case identifiers, source class, report/dataset reference, problem statement, expected behavior, reproduction evidence, acceptance criteria, and local human review status. All 28 start with `verifiedDefect=false`; accepting investigation is not defect verification or approval to change code. Review state is saved in IndexedDB.

## Use

1. Open a saved workspace and edit per-card assignment, status, result and notes. These changes are local collaboration metadata and never confirm a work card.
2. Set a local actor label and use a long passphrase (minimum 12 characters) to export an encrypted request.
3. Transfer the file and passphrase through separate channels you trust. The app does not send either.
4. In the second browser profile, select the file, enter the passphrase, decrypt and inspect the preview, then import as a new workspace.
5. The collaborator edits assignment metadata and exports a reply. The owner imports and previews the reply. Disjoint field changes are merged; same-field concurrent changes require a per-card local/incoming choice.
6. Review the merged notes and separately confirm work cards in the normal product workflow if appropriate.

Imported Workspace card confirmation, feedback approval and improvement lifecycle status are reset by existing import rules. Collaboration status `done` means a collaborator reported completion; it is not proof or product confirmation.

## Offline and limits

The app shell uses the existing service worker cache. Browser tests exercise two isolated browser contexts on one physical test host with file transfer. This is **same-machine isolation acceptance**, not a two-device test. Real airplane-mode/cold-start acceptance remains dependent on the target browser having successfully cached the app shell. IndexedDB is local and not encrypted at rest by this feature. Exchange plaintext excludes audio bytes (workspace records retain only audio metadata/hash) and has no API-key field.

P6C/P6D/P6E are not started.
