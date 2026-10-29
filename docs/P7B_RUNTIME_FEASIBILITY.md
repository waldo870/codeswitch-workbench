# P7B Runtime Feasibility

**Research date: 2026-10-30.** Sources are official upstream documentation/model cards checked for this report. No runtime or model was installed or downloaded, so all local execution claims are `NOT_RUN`.

## NVIDIA Nemotron 3.5 ASR Streaming 0.6B

| Question | Official-source finding | CodeSwitch conclusion |
| --- | --- | --- |
| Windows CPU | NeMo-Speech.cpp documents native Windows installation/build and CPU backend; its supported-model list includes Nemotron 3.5 ASR Streaming 0.6B. | Feasible candidate for a CPU smoke using an explicitly pre-provisioned model path. Not installed or tested here. |
| Windows Vulkan | The build/install docs describe Windows Vulkan builds, requiring LunarG Vulkan SDK and a vendor Vulkan driver. | Runtime backend exists; W7900-on-Windows offload remains unverified. CPU should be the first measured path. |
| HTTP / WebSocket | `nemo-speech serve` exposes HTTP `/v1/audio/transcriptions` and `/v1/audio/transcriptions/realtime` WebSocket; realtime transcription emits `delta` and `completed` events. | Suitable bridge boundary if later implemented as a loopback-only local service; not wired into browser or application. |
| GGUF | The 0.6B card documents a Q8_0 GGUF file and `nemo-speech transcribe ... --model <path>`. | Matches a local file-based provider. The adapter must validate revision/file hash and never trigger implicit downloads. |
| ARM64 | Release naming includes Windows `aarch64`; native build docs mention ARM64 Windows using clang-cl. Linux aarch64 releases are also listed. | ARM64 is platform-packaged/supported in runtime artifacts, but exact device+model performance is unverified. |
| 16 kHz | The model API documents 16 kHz as shipped model sample rate; websocket `session.update` accepts `sample_rate` and PCM16, while WAV HTTP input accepts 8–96 kHz PCM16/float32. | Preserve original audio SHA and record any resampling as a derived audio artifact with its own SHA. Use 16 kHz mono as initial canonical test input. |
| License | NeMo-Speech.cpp repository: Apache-2.0. Model card: OpenMDW-1.1. | Runtime and weights have separate licenses. Retain both notices and verify redistribution of any packaged model file before release. |
| Memory | Model has 0.6B parameters; upstream publishes no specific Windows CPU RAM, Vulkan VRAM, or peak-memory requirement for this configuration in the reviewed docs. | Exact footprint is `NOT_AVAILABLE`; measure model file size, process RSS/commit, GPU memory and chunk/context settings on the target machine. |

The upstream runtime’s published CPU/GPU performance table is for the English-only Nemotron Speech Streaming model, not necessarily this multilingual 3.5 checkpoint. Do not reuse those throughput figures as P7B expectations.

## Hailo Whisper

Hailo’s official `hailo-apps` speech-recognition page lists Whisper Base and Tiny on Hailo-10H, with Python 3.10+, HailoRT 4.20+, and a supported Hailo device. The separate `hailocs/hailo-whisper` repository describes conversion and evaluation for Whisper Tiny/Base and Hailo-10H; its repository code is MIT licensed. Model artifacts/HEFs, original Whisper model terms, Hailo SDK/DFC terms, and redistribution rights must be checked independently. P7B downloads no HEF and installs no SDK.

Hailo’s standalone recognizer presently documents file transcription and microphone recording. The existing CodeSwitch Hailo worker contract can represent a live/mock final result and `HARDWARE_UNAVAILABLE`, but it does not yet expose streaming partials. Before dual mode can use Hailo partials, Hailo adapter/worker protocol work and on-device evidence are required. No device is attached or tested in this P7B run.

The upstream app lists Base/Tiny support; it does not establish CodeSwitch-specific quality, negation retention, zh-TW accuracy, streaming latency, or power consumption. Do not claim those based on app support alone.

## Hailo-10H ↔ Nemotron compatibility

The formats/runtimes are distinct: Nemotron’s GGUF runs under NeMo-Speech.cpp/ggml; Hailo Whisper runs Hailo-converted HEFs under HailoRT or Hailo’s GenAI Speech2Text. No source reviewed says a Nemotron GGUF can execute on Hailo-10H. Dual ASR means orchestration across two separate providers, not running Nemotron on the Hailo device.

## Local endpoint security design for a future adapter

- Node-only bridge; never direct browser-to-runtime calls.
- Bind NeMo HTTP to loopback (`127.0.0.1` by default), with configured fixed endpoint and explicit request timeout/body cap.
- Do not accept an arbitrary user URL, bind to LAN, or expose API keys in browser code/logs.
- For WebSocket, allow only binary PCM16 frames and documented protocol fields; enforce audio-byte and duration limits, cancellation and finalization.
- If the bridge or runtime is unavailable, keep text input functional and report ASR unavailable; never substitute a Mock as Live.

## Official references

- [NeMo-Speech.cpp repository and Apache-2.0 license](https://github.com/NVIDIA/NeMo-Speech.cpp)
- [NeMo-Speech.cpp install/build notes: Windows CPU/Vulkan and ARM64](https://github.com/NVIDIA/NeMo-Speech.cpp/blob/main/docs/install.md)
- [NeMo-Speech.cpp HTTP/realtime server](https://github.com/NVIDIA/NeMo-Speech.cpp/blob/main/docs/server.md)
- [NeMo-Speech.cpp API: PCM/WAV and streaming events](https://github.com/NVIDIA/NeMo-Speech.cpp/blob/main/docs/api.md)
- [Nemotron 3.5 ASR Streaming 0.6B model card](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b)
- [Hailo Apps speech recognition (Base/Tiny and Hailo-10H prerequisites)](https://github.com/hailo-ai/hailo-apps/tree/main/hailo_apps/python/standalone_apps/speech_recognition)
- [Hailo Whisper conversion/evaluation and license](https://github.com/hailocs/hailo-whisper)
