# P6 Offline Acceptance

## Automated acceptance

Vitest covers authenticated encryption/decryption, wrong passphrase, modified ciphertext, unsupported format version, expiry, password floor, size limits, exchange payload/workspace validation, and three-way field merge/conflict detection. Playwright creates two independent browser contexts on the same machine, exports a request file in one, transfers it to the other, imports it as a separate workspace, verifies work cards remain draft, and checks replay rejection.

These two contexts are **same-machine isolated browser-profile acceptance**, not physical cross-device validation. Browser tests run against the built app and its service-worker app shell. The test suite can simulate isolated storage and browser contexts; it does not assert a real external network outage unless explicitly reported as a live offline test.

## Manual offline acceptance checklist

1. Load the app online once; wait for the service-worker app shell to be cached.
2. Use two browser profiles on the same host, or two physical devices for a separately reported cross-device test.
3. Create a Workspace, export an encrypted request, transfer it without a network upload, import in the other profile, record work, and return a reply.
4. Test a wrong passphrase and a locally modified ciphertext; both must fail without adding/replacing a Workspace.
5. Re-import the same exchange in that profile; it must be rejected as replay. A fresh profile has its own ledger and is not covered by this result.
6. Edit the same assignment field independently on both sides; preview the conflict and explicitly choose local or incoming. Edit separate fields and confirm they merge without a conflict.
7. Confirm a card before export; after import it must be draft and require local confirmation again.
8. Open the cached app shell with the network disabled after successful caching. Repeat separately from a cold browser cache; that distinction matters.
9. Verify a file over 5 MB is rejected, Workspace plaintext over 4 MB is not encrypted, and malicious HTML is shown as text.

No real two-device, real network-disconnected cold-start, or adversarial penetration test is claimed by automated tests alone.
