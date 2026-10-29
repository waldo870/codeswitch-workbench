# P6D — Optional Multilingual Work Card Translation

## Status

P6D provides an isolated, deterministic phrasebook prototype for `zh-TW` and `en`. It is not an AI translation system and does not establish translation accuracy. Unrecognized titles fall back to the original text. The provider interface and locale selection are kept separate so additional reviewed providers/locales can be added later.

## Use

Open a saved workspace and use **Optional card translation**. Select Traditional Chinese or English, then choose **Create mock translation** on a card. The current phrasebook intentionally recognizes only a few exact example phrases. It does not translate arbitrary text. If no exact entry exists, the UI displays the original title and reports that no phrase is available.

## Provenance and safety

Each translation is a separate versioned record stored under the `p6d.translation` IndexedDB extension namespace, keyed by workspace, card, and target locale. It records the source title, source evidence snapshot, workspace constraints snapshot, provider/model identifiers, generation time, mock execution mode, target locale, and review-sensitive spans. A stored result is displayed only while its card title, evidence, and constraints still match the source snapshots.

The original Work Card, status, Evidence, Constraints, transcript, and confirmation history are never written by the translation feature. A translation has no confirmation state. Negative instructions, dates, quantities, and likely proper nouns are conservatively marked for human review; this heuristic can miss context or over-flag words and is not a semantic verifier. The original evidence and constraints remain visible beside the translation.

P6D makes no browser-to-LM-Studio requests. The UI only enables the mock. An optional Node-only `LMStudioTranslationProvider` is available for an explicit local smoke/evaluation path; it uses the repository's existing loopback or validated current WSL NAT gateway endpoint rules, local model inventory, bounded transport, JSON Schema response format, and strict response checks. It does not accept arbitrary remote URLs and is not wired into the UI. No cloud provider, model download, or automatic execution is used. The default provider remains the mock.

To opt in to a fixed, non-sensitive one-shot smoke from Node after a local model is already available, set `CODESWITCH_LMSTUDIO_MODEL` to its advertised local model ID and run `pnpm exec tsx src/web/p6d/lmstudio-smoke.ts`. On WSL, `CODESWITCH_WINDOWS_WSL_HOST` is optional and accepted only when it matches the current WSL NAT gateway. No model configuration is changed by the smoke command. Live translation was not run during this P6D implementation.

P6D records live only in the local extension store. They are not automatically included in normal workspace JSON or encrypted exchange files. This prototype does not promise end-to-end identity or exchange security.

## Validation

Automated tests cover the record contract, fixed mock provenance, source immutability, missing-phrase/error fallback, risk flags, stale-record detection, absence of confirmation state, and LM Studio request/schema/error handling with mocked transport. No live model or human translation evaluation was run.
