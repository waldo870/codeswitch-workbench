# P3 runtime provenance

Starting repository: feature/p2-windows-lmstudio-recovery,6887bd48e9b4e1c873b260fafee49a689bfc66b0, clean. New local branch feature/p3-offline-speech-workflow. Existing P2 reports and261 tests were independently checked; no unqualified LLM product mode was enabled.

## LM Studio discovery

Installed Windows LM Studio public `/v1/audio/transcriptions` does not work as a transcription service. An empty multipart probe and a properly formed multipart PCM WAV probe returned415 with `POST requests must use application/json`; a JSON route probe returned HTTP200 with `Unexpected endpoint or method. (POST /v1/audio/transcriptions)`. HTTP200 is not ASR success. Native model inventory exposed no ASR model and `lms --help` listed no transcription command. Classification for this installed public API: **LM_STUDIO_ASR=UNSUPPORTED**.

Official references checked: [compatibility endpoints](https://lmstudio.ai/docs/developer/openai-compat), [REST API](https://lmstudio.ai/docs/developer/rest), [Transcribe coming-soon page](https://lmstudio.ai/transcribe). These describe the observed/current API, not a claim about every future release or internal UI feature. Existing whisper.cpp [server documentation](https://github.com/ggml-org/whisper.cpp/tree/master/examples/server) was reviewed as a possible local alternative; no installed whisper-cli/server was found, and no build/download/install was attempted.

## Existing Windows Whisper

An existing Windows Python3.10 installation already provides whisper.exe/Python Whisper20240930, PyTorch2.4.1+cu118 and FFmpeg. Existing checkpoint: large-v3.pt,3,087,371,615 bytes. SHA-256 `e5b1a55b89c1367dacf97e3e19bfd829a01529dbfdeefa8caeb59b3f1b81dadb` matches the large-v3 model URL digest embedded in the installed official Whisper module. No checkpoint or package was downloaded. Code/weights references: [Whisper upstream](https://github.com/openai/whisper) and its MIT license; this does not assign a license to this owner's project or redistribute weights. External Python/runtime dependencies remain owner-managed, outside pnpm and the repository.

Direct Whisper import initially failed on Numba's optional coverage integration (`coverage.types.Tracer` absent). The worker disables coverage import only in its own sys.modules, consistent with the installed module's optional ImportError branch. It does not edit coverage/Numba, install dependencies or mutate system settings. A readonly probe then successfully imported Whisper/Torch. torch.cuda.is_available() returned False. Worker explicitly uses CPU, fp16=False and8 Torch threads. **GPU_ASR_VERIFIED=NO**; P2's Windows Vulkan GPU LLM evidence is not reused as ASR evidence.

The API-first route was investigated before this fallback. ASR now uses the same owner's Windows runtime through a trusted local child worker, not the unsupported LM Studio audio API. Browser data goes only to the loopback Node bridge. Windows executable/model paths are explicit owner environment configuration, never hardcoded production paths or browser inputs. No ROCm/Windows driver/Linux GPU stack/llama.cpp changes occurred. Windows LM Studio's model library and loaded LLM were untouched.

## Actual speech fixture

The original sentence `Check sandbox credentials. Do not deploy to production.` was spoken by the preinstalled Microsoft David Desktop voice using offline Windows System.Speech. Generator source is tests/live/generate-speech.ps1; the WAV stays ignored under .speech-local, not Git. This is actual synthetic spoken audio passed through real ASR, not a human recording, downloaded dataset, mock output or a model prompt containing expected text. The source sentence is used only by the test harness for review/assertions, never as Whisper initial_prompt.

WAV:155,086 bytes,4.845s,PCM16/mono/16000Hz. Content ID `sha256:b5ea9d94f81ad97ad0a14551b48d862195c6076ec271665c046f428af76c433d`. The raw ASR output omitted sentence punctuation. The first live workflow correctly produced unresolved instead of guessing; the reviewed workflow explicitly adds punctuation in the transcript editor and preserves raw text. A first EOF-buffered transport worked; a proposed framed streaming control revision timed out under actual WSL/Windows interop and was replaced with generated private WAV files. These are engineering revalidations, not prompt tuning or a cherry-picked speech accuracy benchmark. Final actual results and cancellation checks are recorded in P3_TEST_REPORT.md and reports/p3-live-smoke.json.

No confidence or word timestamps are supplied. Model load is included in measured recognition time. Actual multilingual/human/noisy speech and GPU ASR have not been evaluated. Common Voice is only future research; no files were downloaded or redistributed. No push/merge/GitHub settings change is authorized in this phase.

### Reproduce the original fixture in WSL

With the already installed Windows System.Speech voice (no voice download), from the repository root:

```sh
mkdir -p .speech-local
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass \
  -File "$(wslpath -w "$PWD/tests/live/generate-speech.ps1")" \
  -OutputPath "$(wslpath -w "$PWD/.speech-local/p3-smoke.wav")"
# After explicitly configuring existing Python/model paths as in README:
pnpm build
CODESWITCH_LIVE_ASR=1 pnpm speech:live
```

The ExecutionPolicy flag applies only to that generator process; no policy is persistently changed. ASR itself launches Python directly with shell=false and does not use PowerShell. Final raw ASR is preserved verbatim, including its leading space; the user/test-harness correction explicitly changes whitespace and punctuation. Final fixture/result/source hashes and actual latency are in the curated JSON reports. Cancellation uses a request-scoped file marker with closed stdin; no streaming audio/control protocol remains in the final worker.
