# Data policy

P0 uses original, locally authored test sentences plus acceptance examples supplied in the project brief. No third-party dataset has been downloaded or redistributed. Vincent is an unverified name in a synthetic sample; no email address or real identity is inferred.

Runtime input is read locally and printed as JSON to stdout. The application does not transmit text or persist logs, but shell redirection and terminal history are controlled by the user. Avoid entering secrets or real credentials: the sample asks to check credentials but contains none. Dependencies are downloaded during development installation; runtime has no network API integration.

Future research may evaluate Mozilla Common Voice and other speech datasets. Their current licenses, language coverage, consent, redistribution and attribution requirements must be reviewed before use. This repository does not download, redistribute, own, or claim evaluation on Common Voice or any speech corpus.

No models, voice recordings, hardware SDKs, external project code, configuration, secrets, databases or Git history were imported. Source licensing is reserved for the owner; third-party dependency and future model licenses must be recorded separately.
