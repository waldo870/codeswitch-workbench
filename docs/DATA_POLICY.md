# Data policy

P0 uses original, locally authored test sentences plus acceptance examples supplied in the project brief. No third-party dataset has been downloaded or redistributed. Vincent is an unverified name in a synthetic sample; no email address or real identity is inferred.

Runtime input is read locally and printed as JSON to stdout. The P0 CLI does not transmit text or persist logs, but shell redirection and terminal history are controlled by the user. Avoid entering secrets or real credentials: the sample asks to check credentials but contains none. Dependencies are downloaded during development installation; runtime has no network API integration.

Future research may evaluate Mozilla Common Voice and other speech datasets. Their current licenses, language coverage, consent, redistribution and attribution requirements must be reviewed before use. This repository does not download, redistribute, own, or claim evaluation on Common Voice or any speech corpus.

No models, voice recordings, hardware SDKs, external project code, configuration, secrets, databases or Git history were imported. Source licensing is reserved for the owner; third-party dependency and future model licenses must be recorded separately.


## P1 browser data

P1 intentionally persists the analyzed original input, parser output, constraints, current cards and user review history in localStorage under `codeswitch-workbench.workspace.v1`. Unanalyzed input changes are not saved. This is unencrypted per-origin browser storage, not cloud storage. Do not enter secrets or API keys. No analytics, external fonts, inference APIs or user-text uploads are used. The bundled font is an ordinary licensed static asset.

Reload validates source and history before restoring. Corrupt data remains untouched until the user explicitly clears it. A quota/access failure is reported without claiming successful storage. Clear Local Data requires confirmation, clears only this app key and removes the in-memory workspace on success. Downloads are user-triggered JSON artifacts; the user controls their retention and sharing. Export retains complete original input as provenance, which may mention unexported tasks or rejected requests; review it before sharing.

There is no authenticated user identity, encryption, synchronized tabs or protection against a person/browser extension with same-origin storage access. Review metadata proves internal consistency only. No claims are made about validating an email address's ownership or recipient identity. Test addresses use the reserved `.test` domain and are never contacted.


## P2A evaluation data

The 60 text benchmark examples and gold labels are original synthetic project data, not Common Voice or another speech dataset. Names are fictional; no credentials or real personal contacts are used. Only the source sentence is sent to the explicitly local Ollama daemon when available. Gold labels stay in the evaluator. No model was available in this delivery; no inference request was sent. Software tests use mock responses or a temporary loopback HTTP server, never a remote model.

Reports retain source input, raw model content when actually available, schema errors, evidence/constraint validation, metrics and runtime metadata. Treat future model text as untrusted. Reports can contain sensitive text if the dataset is changed, so review content/size before committing or sharing. The committed P2A reports contain only this synthetic dataset and actual baseline measurements, plus explicit NOT_RUN records.

## P2A.4 diagnostics

LM Studio error diagnostics record only identity/case metadata, HTTP status, phase/code, finish reason and numeric usage, plus a bounded preview for failures. The application does not copy Authorization or other request headers. Structured credential keys and recognizable bearer/API-key/password patterns are redacted before previews are bounded. Failed proposals stay null and are never treated as authorized work.

The dedicated hotfix smoke stores raw-text previews locally under reports/local-diagnostics/, which Git ignores. Its committed report contains fixed-case IDs, pass/fail flags, numeric scores, error codes and validation reasons; no raw model body or source utterance is copied into that report. All cases in this run are the frozen original synthetic dataset. Review report content before sharing, and do not supply secrets to the parser/model.

## Windows host evaluation opt-in

The P1 browser and deterministic CLI remain local and do not send workspace text to a provider. A separate Node research/smoke command may send the fixed original synthetic benchmark inputs from WSL to the owner's explicitly configured Windows LM Studio server. This crosses the WSL boundary to the same owner's Windows host; it is not loopback within WSL. The allowed IPv4 must match the current WSL default gateway, with HTTP port1234 and no redirect. Only an operator environment variable enables it; user utterances cannot select URLs. Gold labels stay in the evaluator. No cloud inference, browser request, telemetry, credential header, model download or arbitrary external endpoint is introduced. Existing server binding/firewall settings are observed without modification.

Curated Windows runtime evidence omits process IDs, adapter UUID/LUID and unrelated installed-model names. Model-process correlation was checked locally. Only selected-model metadata and synthetic benchmark outputs are kept in versioned reports. Full Windows application logs and private user files are not imported. The report renderer does not trigger inference. Earlier loopback-only descriptions refer to defaults and previous deliveries; this opt-in is a separate trusted-host boundary.
