# P4F — Offline Acceptance

## Scope and result labels

The browser suite tests offline behavior by routing the browser context offline after a successful app-shell install and IndexedDB save. This is a **simulated network outage**, not a test that physically disconnects the host, reboots it, or disables a router. No firewall, Windows LM Studio, ROCm, or external network configuration was changed.

| Condition | Expected behavior | Evidence in this phase |
| --- | --- | --- |
| A. Internet unavailable | Previously cached app shell opens; saved sessions load from IndexedDB; text parser and validators remain local | Playwright simulated offline test: PASS |
| B. Windows Whisper worker unavailable | ASR status is unavailable; text work-card workflow remains usable; no successful transcript is fabricated | Existing P3 worker-unavailable/browser path plus offline UI assertion; Live worker was not launched for this check |
| C. Windows LM Studio unavailable | Product UI remains deterministic and does not call the LLM research runtime | Runtime/LLM remains evaluation-only; no model endpoint is required by browser workflow |
| D. Hailo hardware unavailable | Hailo worker reports `HARDWARE_UNAVAILABLE`; Mock mode is explicitly labelled and excluded from Live results | Existing P4 worker/adapter contract tests; no hardware access |

P4F does not count Mock responses or skipped live-ASR tests as hardware/provider PASS. See `TEST_REPORT.md` for executed test counts and skipped live tests.

## Reproduce simulated offline acceptance

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test:browser
```

The browser test first visits the built app online, waits for Service Worker registration, reloads under controller, creates and saves a workspace, switches the Playwright context to offline, then reloads and verifies the cached UI, saved cards, constraints and unavailable ASR state. It also verifies that the generated shell cache exists. This test does not imply offline first installation.

## Cold-start and deployment limits

The Service Worker precaches same-origin production assets in the first successful installation. A browser that has never loaded the app, has cleared the cache, uses a deployment that omits `sw.js`, or blocks service workers cannot open the UI offline. Local development server use after an app-shell cache has been established may vary by browser. No test in this phase physically disconnects the host or verifies all target OS/browser profiles. Treat real network-loss cold-start as NOT_RUN.

ASR requires the configured local Windows worker. Without it, users can still type text and analyze locally; the interface states ASR is unavailable and does not claim transcription. LM Studio is not connected to the product UI. With no Hailo device, the worker's real mode reports `HARDWARE_UNAVAILABLE`; the Python Mock option is a protocol fixture only. No email/calendar/tool operation is executed, and draft/rejected cards are not treated as confirmed exports.

## Recovery and data safety

Quota/IndexedDB failures are simulated by making the browser write fail; the UI reports unsaved status and does not restore a phantom record after reload. Corrupt legacy localStorage remains in place until explicit user clearing. Bundle import is bounded, validated, non-overwriting, checks source evidence/constraints, and drops imported confirmations. Missing, damaged, or unsupported records are reported and left untouched rather than silently repaired. Audio bytes are not persisted.
