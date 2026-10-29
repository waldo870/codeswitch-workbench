# P6 Extension Contract

P6D and P6E share this minimal interface so each can be implemented without concurrent edits to `PersistentApp`, the Workspace contract or the IndexedDB record schema.

## UI mount

`src/web/components/P6ExtensionPanels.tsx` is mounted once by `PersistentApp`. Each feature owns a separate panel component:

- P6D owns `P6TranslationPanel.tsx`.
- P6E owns `P6RoutineTemplatesPanel.tsx`.

Each receives `{ record: WorkspaceRecord | null, repository: WorkspaceRepository }`. A missing active Workspace must be handled without throwing; imports/templates may have an explicit path to operate without one.

## Local extension storage

`IndexedDbWorkspaceExtensionStore` uses the already existing `meta` object store and does not change `WORKSPACE_DB_VERSION` or `WorkspaceRecord`. Namespaces are fixed to `p6d.translation` and `p6e.routine-templates`; each namespace owns its record validation, versioning and key format. Values are JSON-serializable, copied on read/write, and limited to 1 MB per key. The shared helper never performs network I/O and never interprets extension values.

P6D and P6E can exchange data only through the explicit P6A encrypted Workspace exchange flow. The contract itself does not include translations or templates in exchange files by default. A feature must obtain user consent before adding extension data to an exchange, or keep it out of the Workspace payload.

Each feature must stay within its assigned component/module, tests and feature-specific documentation. Changes to this contract or shared files require a separate coordinated change rather than overlapping branch edits.
