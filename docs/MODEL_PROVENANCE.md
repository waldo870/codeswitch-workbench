# Model and runtime provenance

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
