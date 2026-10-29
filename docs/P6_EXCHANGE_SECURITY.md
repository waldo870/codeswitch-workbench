# P6 Exchange Security Notes

## Envelope

Exchange format: `codeswitch-workbench-exchange`, version 1. The plaintext JSON payload is bounded to 4,000,000 bytes; the complete JSON envelope is bounded to 5,000,000 bytes. Input files are rejected before parsing when over that limit. A random 16-byte salt and 12-byte AES-GCM nonce are generated per export. A non-extractable AES-256-GCM key is derived with Web Crypto PBKDF2-HMAC-SHA-256 (600,000 iterations). The authenticated additional data contains the canonical format/version, exchange ID, creation/expiry times, salt, nonce and iteration count. GCM uses a 128-bit tag.

Passphrases are held only in component memory, cleared after successful export/import, never written to IndexedDB/localStorage, and never exported as a key. The user must transfer the passphrase separately. A passphrase of at least 12 characters is required; this is a length floor, not an entropy guarantee.

## Validation and replay

Only version 1 and the fixed KDF work factor are accepted. Timestamps are bounded to a 30-day lifetime, limited future clock skew and a valid creation/expiry order. Wrong passwords, authenticated-data/ciphertext tampering, invalid UTF-8/JSON, oversized payloads and workspace schema/evidence failures reject without applying a workspace. Request source ID and digest are checked against the included Workspace bundle. Replies must match the locally stored base digest.

An IndexedDB replay ledger records consumed exchange IDs in the receiving browser profile. Duplicate imports into that profile are rejected. This is not a global anti-replay service: copying a file to a different fresh profile/device creates a separate ledger. Expiry bounds stale-file use; request/reply base matching and explicit preview reduce stale application. No automatic overwrite occurs; incoming workspaces get new IDs. Replies modify collaboration metadata only, and human conflict choices are required when the same field changed on both sides.

Imported work-card confirmations are discarded. User-supplied collaborator labels are not verified identities. No authorization, signing identity, forward secrecy, encrypted-at-rest IndexedDB, endpoint integrity, or full end-to-end collaboration security has been proven. AES-GCM success alone is not such proof.

## Threat boundaries

The design assumes a modern browser with functioning Web Crypto, a passphrase not disclosed to an unintended recipient, and a user who inspects the decrypted preview. A malicious collaborator who knows the passphrase can create a valid exchange containing misleading text; rendering is through React text nodes and schema/provenance validators, but review remains necessary. Avoid entering secrets in workspaces; exchange files intentionally omit original audio bytes and have no secret fields.
