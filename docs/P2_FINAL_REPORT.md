# P2 final report and pre-ROCm-upgrade checkpoint

Latest Windows recovery: **GPU inference VERIFIED; model/product NOT_QUALIFIED**. The WSL GPU BLOCKED findings below remain preserved and specific to that Linux route. See the Windows recovery update appended at the end.

Date: 2026-10-28 (Asia/Taipei). Result: **P2_ENGINEERING_COMPLETE_WITH_LIMITATIONS**. Local LLM product qualification: **NOT_QUALIFIED**. GPU gate: **BLOCKED**. This report does not declare P2_PRODUCT_PASS.

## Engineering result

The verified starting revision is `5f03e2cf55b0a7ebf9e56ded451fd0026bbf73ad` on `feature/p25-model-comparison`; its worktree was clean. P0 contracts, deterministic extraction, source validation and CLI remain operational. P1 editing, human confirmation/rejection, local persistence and confirmed-only export remain operational. Ollama/LM Studio adapters, bounded transport, structured proposal decoding, independent verification, fixed benchmark, strict smoke gating and separate bounded research mode are implemented and tested. Local LLM UI integration, its bridge and Experimental switch are not implemented because capability/latency/safety qualification failed. Engineering completion covers the evaluable framework and preserved deterministic product, not an enabled LLM feature.

Final local regression: frozen install, typecheck, 241/241 Vitest (13 files), build, CLI demo (3 cards, 1 prohibition, validation PASS), 6/6 desktop/mobile Chromium, deterministic benchmark (32/60), and diff check PASS. No original tests were removed. The dataset, gold labels, prompt, schema, strict gate, independent verifier and P1 UI were not changed in this checkpoint.

## GitHub backup result

The owner-authorized initial backup succeeded. The target repository was empty and private; visibility was preserved. `origin` was configured to `https://github.com/waldo870/codeswitch-workbench.git`. Only `feature/p25-model-comparison` was pushed, initially at the verified starting SHA above. Remote SHA equality, README readability and the remote tree containing the fixed dataset/reports were checked. Its complete ancestry preserves P0–P2.5.

Local `main` is only the initialization commit `d890714` containing `.gitignore`, not an application release. It was deliberately not pushed or promoted to a stable P2 release; no main merge was made. No remote main ref existed at backup verification. No force push, mirror, branch deletion or history rewrite occurred. The closing commit remains on the feature branch and is pushed normally after local gates; its exact resulting SHA is provided in the completion response and Git history rather than a self-referential in-commit value.

The initial backup triggered [GitHub Actions run 40622963559](https://github.com/waldo870/codeswitch-workbench/actions/runs/40622963559), which completed successfully at starting SHA `5f03e2cf55b0a7ebf9e56ded451fd0026bbf73ad`. A new closing push triggers a separate run; its status must be checked against that closing SHA. A pending run is not a PASS and the earlier success is not proof of the later run.

### Data review before push

All 150 unique historical blobs reachable from the starting feature/main history were scanned, not just the worktree. The largest was the 588,056-byte synthetic benchmark report. No model weights, audio, caches, credential files, private WSL configuration, Windows user-file content, unauthorized dataset or other-project source was found. Two credential-assignment matches were confirmed to be fixed dummy values in redaction unit tests, not live credentials. Known absolute model/CLI path references are diagnostic metadata for owner-provided resources; they do not contain Windows documents or private configuration. Historical raw reports contain original synthetic benchmark inputs. No home-directory configuration, model weights or entire host logs were added to this checkpoint. New GPU evidence contains hashes and sanitized excerpts without queue addresses, PIDs, GPU UUIDs or unrelated host inventory. Private visibility did not replace this review.

## Model quality result

The preserved CPU experiment is a real single-pass run, not mock inference. It attempted all 60 fixed inputs but obtained only 18 valid completed proposals and 42 timeouts. It is **not a complete 60-inference semantic benchmark**. The 42 timeouts are separate non-semantic outcomes; conditional accuracy denominators exclude them. No new CPU inference or model tuning was performed in this finalization.

Dataset SHA-256: `d0ada927031c7d88bfc0088b95e54d0d597e85e7dd1924732be14b8768767c94`.

| Metric | Deterministic | CPU 12B + schema | CPU 12B + verification | GPU 12B |
| --- | --- | --- | --- | --- |
| Valid completed inputs | 60/60 | 18/60 | same 18 upstream | NOT_RUN |
| Complete gold outcome / assessed | 32/60 | 2/18 | 3/18 | NOT_RUN |
| Operational gold-outcome yield / all inputs | 32/60 | 2/60 | 3/60 | NOT_RUN |
| Intent exact | 39/60 | 10/18 | 8/18 | NOT_RUN |
| Card count | 38/60 | 10/18 | 8/18 | NOT_RUN |
| Slots | 104/171 | 7/25 | 1/25 | NOT_RUN |
| Constraint recall | 3/13 | 1/10 | 0/10 | NOT_RUN |
| Unsupported anchor rate | 0/39 | 2/5 | 1/1 | NOT_RUN |
| Evidence validity | 77/77 | 16/19 | 18/18 | NOT_RUN |
| Safe review/block | 28/28 | 7/11 | 11/11 | NOT_RUN |
| Timeout count | 0 | 42/60 | same upstream timeouts | NOT_RUN |
| Completed-output P50/P95 ms | see latest baseline JSON | 48345.25/59252.70 | 48345.38/59253.17 | NOT_RUN |
| All-attempt P50/P95 ms | see latest baseline JSON | 60001.55/60002.69 | same upstream attempts | NOT_RUN |
| Generation tokens/s | not applicable | NOT_MEASURED | not separate inference | NOT_RUN |

Three gold constraint tuples are unassessed due timeout. The one raw recovered tuple has invalid evidence punctuation, so it is not retained as a grounded constraint by C. Evidence validity after verification includes source-grounded review/unresolved records; it does not repair original quotes or prove original proposal correctness. Complete outcomes are correct handling of unknown inputs, not successful nonempty task extraction: B successes are ambiguous-02/04; C additionally rejects the guessed task in ambiguous-01. Safe refusal of actual work does not earn task success. Seventeen of eighteen proposals were blocked or required review, including legitimate unresolved cases; the 42 timeouts did not reach semantic verification. The only retained draft candidate was never confirmed or admitted into the UI.

The frozen unsupported-anchor metric flags `the deployment plan` versus `deployment plan` in en-02. This is a scorer false positive, not an invented task. The other raw unsupported anchor is the task guessed from ambiguous-01. Likewise `all` versus `*` contributes to the normalized publish constraint mismatch in constraints-08, which also lacks a structured confirmation prerequisite. The fixed prompt's action examples omit summarize; this is a possible confound, not a verified causal explanation. Gold/scorer/prompt were not changed to improve results. See [model evaluation](MODEL_EVALUATION.md) for failure review and limits.

Gemma 4B historical Full Smoke is 0/8; its 60-case benchmark was not run. The 12B research run contains the frozen smoke subset, with Full checks 1/8 (only an appropriate unknown-input refusal). No new strict command was run here and no strict qualification was granted.

## GPU result

The machine remains Ubuntu 22.04.5 under WSL2, with ROCm package `6.2.3.60203-124~22.04`, HIP runtime `6.2.41134.60203-124~22.04`, and WSL HSA package `1.14.0-2057403.22.04`. Approved host readonly checks see `/dev/dxg` and `rocminfo` exits0 identifying AMD Radeon PRO W7900/gfx1100. The Codex filesystem sandbox hides `/dev/dxg`; its absence there was not interpreted as missing host hardware. `rocm-smi` reports no native amdgpu module, which alone is not a conclusive WSL inference diagnosis.

| Runtime / evidence | Observed result | Interpretation |
| --- | --- | --- |
| Resident LM Studio Gemma 12B / original CPU engine | Load log says compiled without GPU support/offload | Existing model is not a proven GPU run |
| Currently selected installed Vulkan engine 2.41.0 | `errorSurveyingHardware`, empty GPU inventory in both sandbox and approved host probe | GPU usability blocked; selection label is not proof of a working compiled GPU path |
| Existing HIP ADD / MUL_MAT logs | 167/167 and 2490/2490 tests passed | Some kernels worked; this does not prove transformer inference |
| Existing HIP Gemma 12B and 4B logs | `HSA_STATUS_ERROR_INVALID_CODE_OBJECT`, `0x1010` | Full-model GPU inference has existing failure evidence |

The selected engine is Vulkan; that selection is distinct from the already resident CPU-loaded model. No backend selection or model reload/unload was performed in this checkpoint. No Windows LM Studio model was touched. Model inventory shows Gemma 12B Q8_0 loaded/IDLE, context8192, parallel1; 4B and the embedding model are not loaded. GPU layers/offload have no verified successful GPU load, generation tokens/s is unavailable, and GPU benchmark timeouts are NOT_RUN rather than zero.

The external HIP runtime checkout is clean at `d05706b4f32a545814856e98ca518292585443b9`; its existing build cache enables `GGML_HIP=ON`, CUDA/Vulkan OFF and both GPU target settings=gfx1100. This verifies a HIP-enabled build configuration, not successful model execution. The runtime checkout was only read, not modified or rebuilt.

Existing local failure sources, retained without reexecution:

- `~/tools/hip-w7900-test/gemma12b-rocm.log`, lines1–2: process compute queue status00001010; HSA invalid code object0x1010.
- `~/tools/hip-w7900-test/gemma4b-rocm.log`, lines1–2: the same error.
- LM Studio `2026-10-28.1.log`, lines9607–9611: no GPU support/offload warning; line10044: model loaded.

[Sanitized evidence and original-file hashes](../reports/p2-final-gpu-check.json) bind these observations to the verified starting Git commit. No known failed HIP/model test was repeated in an unchanged environment. No alternative GPU benchmark was attempted through silent CPU fallback. Phase4 GPU Smoke and Research are **NOT_RUN**, because Phase3 did not establish successful GPU inference. New GPU benchmark latency/tokens/s/quality comparisons cannot be supplied.

## ROCm 6.2.3 preservation

All required files exist under `~/tools/rocm-upgrade-backup/`, were read/hash-verified and were not overwritten. Fresh readonly host snapshots match all three backup hashes:

| Backup | SHA-256 | Current comparison |
| --- | --- | --- |
| packages-before.txt | ae7bf2e0bb3bc09a0a410abb2d27cdef9916e8430e7182b0c1e5005f44f87405 | identical full dpkg-query listing |
| rocminfo-before.txt | 2a55fe29c500a68f53ac2765d29ab28d484efa5586990c87a08fee613002a1e1 | identical approved host rocminfo output |
| hsa-targets-before.cmake | 92ab5ebd5b1955414e3657225bbed0d76979edbb85c2c2390bc172f197b90092 | identical installed HSA target file |

The installed HSA target file was only read/compared. No system libraries, CMake patches, device permissions, packages, drivers, global environment or network binding were modified. Full private host snapshots remain local, not in Git.

**ROCM_7_2_UPGRADE_AUTHORIZED=NO.** No installation/removal/upgrade, amdgpu-install, runtime download, model download or full ROCm rebuild was performed. This checkpoint does not endorse an upgrade as a proven fix; compatibility and rollback planning require a separately authorized task.

## Product result and remaining work

P2 is closed as **P2_ENGINEERING_COMPLETE_WITH_LIMITATIONS**. Model quality and GPU prerequisites do not qualify Local LLM product integration. P1 deterministic mode, explicit human confirmation and local export remain available. No LLM UI mode/bridge was added and **P2_PRODUCT_PASS is not declared**.

Potential future work requires separate scope: resolve GPU runtime/code-object compatibility with preserved rollback materials; prepare an independent development set for prompt/action/constraint normalization; preregister held-out evaluation before product integration. P3 speech remains planned/not started. ASUS UGen300/Hailo-10H integration and target-hardware end-to-end validation remain planned/not tested. This task stops here without beginning them or upgrading ROCm.


## Windows LM Studio GPU recovery update

Windows LM Studio0.4.26.0 → WSL NAT gateway access is restored, using already loaded Gemma3 27B IT Q8_0. Actual Vulkan2.65.1 llama-server GPU compute and dedicated-memory counters correlate with W7900; GPU participation is verified. Exact layer count/full-layer offload is unverified. No ROCm/driver/firewall/binding/model setting changes occurred. The historical CPU12B experiment and WSL HSA0x1010/llvmpipe failures remain intact.

Simple Schema probe PASS; frozen Smoke Full3/8 (FAIL). Explicit research completed60/60 valid outputs,0 timeouts. Raw complete20/60; independently verified16/60; raw intent51/60,slots138/171; constraint recall4/13; raw evidence96/99. Verified evidence64/64 includes review records. Median/P95 raw latency7298.75/14800.46ms. CPU12B versus Windows27B differs in model size and runtime, so this does not isolate GPU speedup. Baseline remains32/60 complete. The model still fabricates actions on a prohibition and misses constraints; en-05 exposes an independent verifier reminder/type gap. Software261/261 tests and6/6 browser tests pass; software success does not override those model findings.

P2_ENGINEERING_COMPLETE_WITH_LIMITATIONS remains the final status. **P2_PRODUCT_PASS is not declared.** P1 stays deterministic, with no LLM UI or bridge. Next research should define source-preserving/normalized proposals and prerequisite representation on a separate development set, independently harden verification, and measure on held-out data. No prompt tuning on this fixed60-case set, P3 start, ROCm upgrade, model download or new provider occurred. See [full Windows recovery comparison](../reports/p2-windows-recovery.md), [raw experiment](../reports/p2-windows-gemma-3-27b-it.json) and [runtime proof](../reports/p2-windows-runtime.json). The recovery commit is local on feature/p2-windows-lmstudio-recovery; this task does not push or merge it.
