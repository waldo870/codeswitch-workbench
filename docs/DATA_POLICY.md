# Data policy

P0 uses original, locally authored test sentences plus acceptance examples supplied in the project brief. No third-party dataset has been downloaded or redistributed. Vincent is an unverified name in a synthetic sample; no email address or real identity is inferred.

Runtime input is read locally and printed as JSON to stdout. The P0 CLI does not transmit text or persist logs, but shell redirection and terminal history are controlled by the user. Avoid entering secrets or real credentials: the sample asks to check credentials but contains none. Dependencies are downloaded during development installation; runtime has no network API integration.

Future research may evaluate Mozilla Common Voice and other speech datasets. Their current licenses, language coverage, consent, redistribution and attribution requirements must be reviewed before use. This repository does not download, redistribute, own, or claim evaluation on Common Voice or any speech corpus.

No models, voice recordings, hardware SDKs, external project code, configuration, secrets, databases or Git history were imported. Source licensing is reserved for the owner; third-party dependency and future model licenses must be recorded separately.


## P1 browser data

P1 intentionally persists the analyzed original input, parser output, constraints, current cards and user review history in localStorage under `codeswitch-workbench.workspace.v1`. Unanalyzed input changes are not saved. This is unencrypted per-origin browser storage, not cloud storage. Do not enter secrets or API keys. No analytics, external fonts, inference APIs or user-text uploads are used. The bundled font is an ordinary licensed static asset.

Reload validates source and history before restoring. Corrupt data remains untouched until the user explicitly clears it. A quota/access failure is reported without claiming successful storage. Clear Local Data requires confirmation, clears only this app key and removes the in-memory workspace on success. Downloads are user-triggered JSON artifacts; the user controls their retention and sharing. Export retains complete original input as provenance, which may mention unexported tasks or rejected requests; review it before sharing.

There is no authenticated user identity, encryption, synchronized tabs or protection against a person/browser extension with same-origin storage access. Review metadata proves internal consistency only. No claims are made about validating an email address's ownership or recipient identity. Test addresses use the reserved `.test` domain and are never contacted.
