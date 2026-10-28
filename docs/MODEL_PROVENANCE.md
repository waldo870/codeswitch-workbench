# Model and runtime provenance

Chronological record: early NOT_RUN sections describe earlier deliveries. Current Gemma CPU observations appear in the P2.5 section below.

## This delivery

No local model was tested or downloaded. `command -v ollama` returned no path. Therefore `ollama --version` and `ollama list` were not runnable. Both sandbox and permitted external loopback probes of `http://127.0.0.1:11434` returned connection refused. The implemented discovery CLI also recorded NOT_RUN. This establishes that Ollama is unavailable to this evaluation environment, not that models cannot exist elsewhere on the owner's host.

- Provider version: NOT_AVAILABLE.
- Model tag/digest/license: NOT_RUN / NOT_AVAILABLE; no installed model inventory could be obtained.
- Model inference: NOT_RUN. Mock and local HTTP server tests are software tests, not model inference.
- Host-visible CPU: Intel Core i9-14900K, 32 logical CPUs; Linux x86_64, Microsoft hypervisor reported by lscpu.
- Host-visible memory: approximately 62 GiB in the readonly preflight.
- GPU: not established. `nvidia-smi` was absent. `rocm-smi --showproductname` reported amdgpu driver not initialized (even though the command exit was 0); no GPU inference capability was inferred from it.
- Node v22.23.2 and pnpm 11.25.0 retained. No driver, runtime, Node or Ollama upgrade was performed.
- ASUS UGen300 / Hailo-10H: Planned / Not Tested. These host observations provide no evidence of target-hardware performance.

Each recorded JSON run includes evaluation timestamp, dataset version/hash, Node/OS/CPU/memory, Git HEAD/dirty flag, extraction-source fingerprint, prompt version/hash, parameters and latency samples. Git HEAD is the pre-commit base when recording a working-tree experiment; the source SHA-256 identifies the actual TypeScript files under contracts/engine/llm/evaluation. Source reports preserve their own timestamps and environment when aggregated.

## Optional candidates for a future owner-authorized installation

These are suggestions only, not installed or evaluated models. Check the actual installed manifest, digest, quantization, license and runtime support before use; a model tag is mutable.

| Role | Candidate | Official reference | License declared by upstream |
| --- | --- | --- | --- |
| Smaller local comparison | qwen2.5:1.5b / Qwen2.5-1.5B-Instruct | [Ollama library](https://ollama.com/library/qwen2.5:1.5b), [Qwen model card](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct) | Apache-2.0 |
| Larger Chinese/English comparison | qwen2.5:7b / Qwen2.5-7B-Instruct | [Qwen model card](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct) | Apache-2.0 |

The official references were reviewed during this task. Multilingual descriptions are upstream claims, not project measurements. No model license is substituted for the owner-reserved project source license.

For an actual run, the adapter checks `/api/version`, `/api/tags` and `/api/show`, records installed model digest/details/license text, and refuses known cloud tags or remote-model metadata. The CLI accepts at most two installed models and never calls a pull endpoint. A trusted local Ollama daemon is part of the trust boundary; this is not a defense against a malicious daemon that misrepresents its identity or forwards traffic covertly.

## API reference

The implementation follows [Ollama Structured Outputs](https://github.com/ollama/ollama/blob/main/docs/capabilities/structured-outputs.mdx): schema in the chat request's format field, non-streaming output and temperature zero. JSON Schema validation remains separate from semantic verification.

## P2A.1 LM Studio environment inspection

Session: 2026-10-23. Verified starting HEAD: 2166bec62f0cc59b185054136572f617dd7c2f6d. Working tree was clean before the P2A.1 branch was created.

`command -v lms` and `command -v ollama` returned no path. Known user-local CLI paths `/home/waldo870/.lmstudio/bin/lms` and `/home/waldo870/.cache/lm-studio/bin/lms`, and `/home/waldo870/.lmstudio/models`, were absent. Thus no CLI version, supported CLI help/status or installed-model list was available. Prior project provenance and local provider configuration were inspected; only loopback defaults were present. Short `/v1/models` probes on 127.0.0.1:1234 both inside and outside the sandbox returned connection refused.

LM Studio version, model ID/digest/quantization/license and GPU participation: **NOT_AVAILABLE / NOT_VERIFIED**. Actual live smoke: **NOT_RUN**. Full LM Studio benchmark: **NOT_RUN**. Software mock tests are recorded separately in TEST_REPORT.md. No service/runtime/model/driver was installed, started or upgraded; no environment, firewall or binding settings changed.

This tool environment's loopback may differ from a desktop/Windows host's loopback. No host IP, LAN address, port forwarding or external endpoint was tried. Minimal owner actions: provide a trusted existing LM Studio service on loopback port 1234 in the same environment as the Node benchmark; load an already available local instruction model; inspect its metadata/license; run discovery and select its advertised ID. If the service exists only in another environment, run this checkout's Node CLI in that same environment or have the owner arrange a trusted same-environment loopback service. This delivery does not bridge the boundary automatically.

LM Studio integration follows the official [Structured Output documentation](https://lmstudio.ai/docs/developer/openai-compat/structured-output), retrieved during this task. `/v1/models` does not guarantee a provider version, quantization, digest, license or GPU utilization; unavailable fields stay null/NOT_VERIFIED rather than being inferred from the model name. No API key is printed or added; an authenticated server that denies discovery remains unavailable to this CLI.

## P2.5 Gemma 12B CPU experiment (2026-10-28 Asia/Taipei)

Previous sections describe earlier environments, not the current runtime. Current inventory includes Gemma 3 4B Q8_0 and owner-provided Gemma 3 12B IT Q8_0. The embedding model is not an instruction model and was not used. No third provider or downloaded model was added.

The 12B Windows original is 12,509,949,696 bytes. Its GGUF v3 header was checked, the entire file hashed (`ada634ebc7c2405dc169b2c6a7a38e807073f75895dc59ba6fe5d26a1340b5f1`), and LM Studio loaded it successfully. The local SHA-256 matches the SHA-256 on the [publisher file page](https://huggingface.co/lmstudio-community/gemma-3-12b-it-GGUF/blob/main/gemma-3-12b-it-Q8_0.gguf) (displayed commit a291621), checked during this task. Only metadata was retrieved; no model weights were downloaded. After `lms import --symbolic-link --dry-run --user-repo lmstudio-community/gemma-3-12b-it-GGUF <original>`, the actual symbolic-link import left the original untouched. No copy/download was made. `lms load --estimate-only` reported 13.44 GiB at 8192 context/one prediction; available RAM was approximately 56 GiB. The 4B was unloaded before 12B load. Actual load took 95.61 seconds and reported 11.65 GiB. The 13.44 GiB estimate is a planning estimate, not evidence of GPU allocation or use.

CLI commit: `69d945a`. Selected inference engine: `llama.cpp-linux-x86_64-avx2@2.41.0`. Load log explicitly warns that GPU offload was not compiled in. CPU survey detects AVX2/AVX and no GPUs. A temporary selection of the already installed Vulkan engine produced `errorSurveyingHardware`; the original CPU selection was restored without reloading/changing the active CPU model. No Runtime/driver was installed or upgraded. These are CPU observations, not Radeon PRO W7900, Hailo or UGen300 results. See `reports/p25-runtime.json` for local observations.

Model identifier: `gemma-3-12b-it`, quantization Q8_0, context8192, parallel1. Inference parameters and prompt are unchanged: temperature0, seed42, max_tokens4096. File SHA-256 is a local immutable identifier; the OpenAI-compatible API does not expose a publisher digest. LM Studio application version remains unavailable from the discovery API. Gemma is subject to [Google's Gemma terms](https://ai.google.dev/gemma/terms); the community GGUF is identified by its [publisher repository](https://huggingface.co/lmstudio-community/gemma-3-12b-it-GGUF). No project source license is inferred from model terms. Owner is responsible for applicable model distribution/use terms; this task does not redistribute weights.

## Windows LM Studio recovery (2026-10-28)

Owner-started Windows service is reachable from the current WSL NAT gateway on port1234. No listener/firewall/binding was modified. `/v1/models`, native `/api/v0/models` and `/api/v1/models` identify the already loaded `gemma-3-27b-it`, Q8_0,29,565,344,032 bytes, context8192,parallel4,flash attention and GPU KV cache enabled. No model download/reload/unload occurred. CLI commit `dcefd5a`; actual model process executable is the Windows Vulkan AVX2 backend2.65.1 and has `ggml-vulkan.dll`/`vulkan-1.dll` loaded.

During fixed Smoke, a readonly Windows GPU performance snapshot showed llama-server Compute utilization93% and dedicated GPU memory32,835,096,576 bytes. Process PID and GPU counter LUID were correlated internally with the W7900 device from the successful Vulkan hardware survey; unique IDs are omitted from curated evidence. Windows driver32.0.32015.7029, runtime driver26.10.1 (LLPC),Vulkan1.4.357. This confirms real GPU participation, beyond HTTP success, device naming or a requested offload setting. It is one utilization snapshot, not average utilization. Resolved load setting requests max offload; exact executed GPU layer count/full-layer offload is not exposed and remains unverified. Tokens/s was not separately collected; end-to-end latency is not substituted for generation speed.

The simple JSON probe returned expected JSON, matching model ID and stop finish reason in2581.67ms. Windows27B versus prior WSL CPU12B is a different-model/runtime contrast, not an isolated GPU speedup experiment. Node environment metadata describes the WSL evaluation client, while the model server runs on Windows. The Linux ROCm6.2.3/HSA0x1010 and llvmpipe failures remain preserved; they do not negate a working Windows Vulkan route. No ROCm/driver upgrade or third provider was added. See reports/p2-windows-runtime.json and the final recovery report for actual metrics.
