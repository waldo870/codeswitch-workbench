# P7A Nemotron 3.5 ASR Feasibility

**Status: research and contract only. Live inference: NOT_RUN.** No model was downloaded, no runtime was installed, and no GPU/runtime setting was changed for this work.

## Decision summary

| Candidate | CodeSwitch fit | Runtime/hardware outlook | P7A decision |
| --- | --- | --- | --- |
| Nemotron 3.5 Transcribe 30B-A4B | Official matrix lists English and Chinese Mandarin as ASR and code-switch supported. Traditional zh-TW output is not separately specified. Rich output can include timestamps and speaker tags. | 34B total parameters (4.3B active); NVIDIA lists 1× H100 80 GB as deployment. No AMD W7900 or Hailo target is listed. | Keep as a research reference; poor first candidate for the single W7900 setup without a demonstrated supported runtime and sufficient memory. |
| Nemotron 3.5 ASR Streaming 0.6B | English `en-US`/`en-GB` is transcription-ready; Mandarin `zh-CN` is broad-coverage. No `zh-TW` locale is listed. Streaming is native; language ID is prompted or auto-detected. Explicit code-switch support is not stated in the model card. | 0.6B parameters; NVIDIA publishes an official Q8_0 GGUF route via NeMo-Speech.cpp, which has Windows installation and CPU support. This is a plausible low-resource experiment, not proof of W7900 GPU acceleration. | Best candidate for a later offline feasibility smoke, beginning with CPU/portable runtime and explicit `zh-CN` versus `auto` conditions. |

These are source-based feasibility judgments, not local compatibility results or quality claims. The 0.6B card’s published FLEURS numbers are NVIDIA-reported benchmark results and do not predict CodeSwitch performance. The Transcribe card’s benchmark numbers likewise use their stated datasets and normalization; neither is a substitute for P5/P3C evaluation.

## Official model and license review

### Nemotron 3.5 Transcribe 30B-A4B

- Model card/repository: [NVIDIA-Nemotron-3.5-Transcribe-30B-A4B](https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Transcribe-30B-A4B).
- It is described as an offline multilingual speech/audio model for up to 40 languages and one-hour recordings; formats include WAV, FLAC, MP3, OGG, and decodable PCM. The documented waveform path is 16 kHz, single-channel float32 PCM.
- Total size is 34B parameters, including audio components; “4.3B active” is not the memory footprint. BF16, FP8, and NVFP4 checkpoints are listed. NVIDIA’s hardware table gives a 1× H100 80 GB deployment reference. Exact host-memory/VRAM requirements for this project are **not measured**.
- The language matrix marks English and Chinese Mandarin ASR and code-switching supported. The model card says parenthetical regional variants count; Mandarin has no `zh-TW` variant listed, so Traditional Chinese/Taiwanese behavior remains unverified. “Supported” is the card’s quality tier, not an accuracy guarantee.
- License shown: [OpenMDW-1.1](https://openmdw.ai/license/1-1/). The license grants broad rights to deal in model materials subject to its terms and requires retention of license/origin notices when redistributing. NVIDIA describes commercial and non-commercial use as ready. This is not legal advice and does not clear rights in audio, datasets, names, or downstream deployment.
- Windows is present in the model card’s OS matrix, including WSL2 for Linux runtimes; its specific GPU compatibility table names NVIDIA architectures/devices. That does not establish Windows-on-AMD support.

### Nemotron 3.5 ASR Streaming 0.6B

- Model card/repository: [nemotron-3.5-asr-streaming-0.6b](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b).
- It is a 600M-parameter cache-aware FastConformer-RNNT ASR model with chunk sizes from 80 ms through 1120 ms, punctuation/capitalization, and optional automatic language detection. The documented input is mono WAV; its model interface accepts audio and language ID. No project-side conversion support is implemented here.
- Language table: English `en-US`/`en-GB` is transcription-ready; Mandarin `zh-CN` is broad-coverage; `zh-TW` is not listed. The model is not explicitly advertised as code-switch ASR. A language tag can be retained for labeling, but mixed-language segment accuracy must be measured independently.
- The card shows 0.6B F32 model parameters and provides a Q8_0 GGUF example through [NVIDIA NeMo-Speech.cpp](https://github.com/NVIDIA/NeMo-Speech.cpp). A rough parameter-only storage estimate for 0.6B F32 values is about 2.4 GB decimal before metadata/temporary tensors; this is arithmetic, **not** a measured download size, RAM/VRAM requirement, or peak memory estimate. GGUF file size and runtime memory must be measured from the exact revision later.
- Governing model terms: [OpenMDW-1.1](https://openmdw.ai/license/1-1/), with the same redistribution notice and rights-clearance caveats above. The card says the model is ready for commercial use.
- NVIDIA’s [NeMo-Speech.cpp](https://github.com/NVIDIA/NeMo-Speech.cpp) lists this model and provides Windows installation instructions. Its published CPU figures are for the English-only Nemotron Speech Streaming model, not this multilingual 3.5 checkpoint; they must not be attributed to this candidate. The project has not built or run that runtime.

## Platform feasibility

### Windows

There is an official Windows route for the 0.6B checkpoint through NVIDIA NeMo-Speech.cpp, and the model card includes a local GGUF command. This makes native Windows the cleanest possible future smoke route because CodeSwitch already uses a Windows Whisper worker boundary. Windows compatibility of this exact downloaded release, device backend, driver, audio path, and model revision still needs a real smoke. Do not route audio to the LM Studio chat endpoint: it is not an ASR API.

For 30B-A4B, the model card lists Windows/WSL2 in its integration table but the deployment reference and hardware support remain NVIDIA-centric. A Windows OS listing does not imply a practical single-card W7900 configuration.

### Radeon PRO W7900 / AMD

Neither candidate’s official supported-hardware table establishes AMD ROCm or Radeon PRO W7900 support. The 30B model’s listed hardware is NVIDIA, and its H100 80 GB reference exceeds the W7900’s nominal 48 GB VRAM. Active parameter count must not be used to infer that the full model fits. For 0.6B, CPU inference looks more plausible from model size and the official native C++ runtime, while AMD GPU offload is **unverified**. No ROCm, Vulkan, or W7900 benchmark was run in P7A.

### ASUS UGen300 / Hailo-10H

No NVIDIA source reviewed here documents either Nemotron model as a Hailo-10H/HEF model. GGUF, NeMo, CUDA, or TensorRT artifacts are not directly executable on Hailo. A port, supported conversion/quantization path, Hailo runtime implementation, licensing review, and device tests would be required. Hailo compatibility is **not established**; do not infer it from the model’s small parameter count.

## Existing CodeSwitch boundary reviewed

- `src/contracts/speech.ts` already carries provider/model identity, audio source, transcript, language, duration, runtime, status, and error metadata. `SpeechSession` separately preserves raw recognition, corrected transcript, edit history, and transcript confirmation revision.
- `src/speech/providers.ts` validates provider metadata and creates a new unconfirmed session for each provider run.
- `src/speech/windows-whisper.ts` is a local Windows Python worker, CPU-tagged; it validates WAV identity and worker response. P7A does not modify it.
- `src/speech/hailo.ts` and `src/contracts/hailo-worker.ts` define a versioned Hailo worker contract with explicit `live`/`mock` and hardware-unavailable behavior. P7A does not change or claim Hailo readiness.
- P3 transcript review in `src/web/components/SpeechPanel.tsx` displays the original ASR transcript, tracks user edits, requires transcript confirmation, and only then analyzes through existing workflow logic.
- P4G feedback is a local deterministic feedback/proposal workflow; P7A creates no feedback record and does not treat a model or mock discrepancy as a verified defect.
- P5 `src/speech/evaluation.ts` separates live from mock results, scores CER/WER/terms and constraint/workflow metrics, and reports provider provenance. It is the intended evaluation layer; this contract is not wired to the UI or benchmark runner.
- P6 encrypted exchange serializes reviewed workspace data, but no Nemotron-specific result or model invocation is added to exchange. Audio is not included by default.

## Proposed optional provider boundary

P7A adds a research-only contract in `src/contracts/nemotron-asr.ts` and a deterministic mock in `src/speech/nemotron-mock.ts`. It is not a live adapter and is not registered in the production UI.

The record contains a fixed provider/model identity, execution mode, source audio SHA-256 and format metadata, immutable `rawTranscript`, optional language metadata, optional timestamp/speaker segments, runtime and inference provenance, status/error, and the constant `humanReview: required`. An optional summary is a separate field; there is no translation-to-transcript mapping. Segment timestamps and speaker IDs are optional and are never synthesized. A speaker ID is only a diarization label, not a verified identity. Every result is checked against the source audio identity. A new provider result must enter P3 review as an unconfirmed session; confirmations must not transfer between providers or devices.

The contract intentionally does not claim semantic correctness: valid shape, a SHA match, or a transcript segment does not prove the words were spoken. Existing workflow validation and human confirmation remain mandatory.

## Decision and next step

The 0.6B model is a reasonable **candidate for a controlled CPU/Windows runtime smoke** because the official material names a Windows-capable C++ runtime and supplies a quantized GGUF path. It is not yet a supported product provider: code-switch support, zh-TW, terminology, negation preservation, AMD offload, and Hailo execution are unverified. Keep Windows Whisper as the existing baseline and require identical audio samples and normalization for comparison. Do not start the 30B model on the W7900 without a separately verified memory/runtime plan.

## P7A implementation verification

- Nemotron contract/mock tests: 5 added tests; included in the 416/416 passing Vitest suite.
- TypeScript typecheck: PASS.
- Production build: PASS.
- Existing CLI demo: PASS (3 draft work cards, 1 prohibited constraint, validation pass).
- Browser suite: 42 passed; 4 existing live-ASR tests skipped by their environment conditions. Skips are not counted as passes.
- `git diff --check`: PASS.
- Live Nemotron model inference and model accuracy: **NOT_RUN**.

## Official references

1. [Nemotron 3.5 Transcribe 30B-A4B model card](https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Transcribe-30B-A4B)
2. [Nemotron 3.5 ASR Streaming 0.6B model card](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b)
3. [OpenMDW-1.1 license](https://openmdw.ai/license/1-1/)
4. [NVIDIA NeMo-Speech.cpp](https://github.com/NVIDIA/NeMo-Speech.cpp)
5. [NVIDIA TensorRT-Edge-LLM experimental ASR runtime](https://github.com/NVIDIA/TensorRT-Edge-LLM/tree/main/examples/speech_recognition) — NVIDIA-runtime-specific information only; not AMD/Hailo compatibility evidence.
