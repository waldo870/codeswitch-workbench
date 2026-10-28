# P3A/P3B test report

Result: **P3_END_TO_END_PASS for the reviewed workflow on one original synthetic English speech fixture**. This is not a raw-ASR/no-correction pass, a mixed-language accuracy benchmark or GPU ASR qualification. P3A real transcription and P3B review/card/export flow passed; broader recognition quality remains unmeasured. P2 LLM product mode stays disabled.

## Verified baseline and scope

Started clean on feature/p2-windows-lmstudio-recovery at6887bd48e9b4e1c873b260fafee49a689bfc66b0. Independently reran261/261 Vitest,6/6 Chromium,typecheck,build and CLI demo. Created feature/p3-offline-speech-workflow without changing P0 parser/validator, P2 adapters, prompt, benchmark gold or LLM UI qualification. P1 Workspace v1 is compatibly extended with optional speech provenance; all original tests remain.

## Actual final gates

| Command | Result |
| --- | --- |
| pnpm install --frozen-lockfile | PASS, no new dependency installed |
| pnpm typecheck | PASS |
| pnpm test | PASS309/309 in19 files: original261 retained +48 new |
| pnpm build | PASS |
| pnpm demo | PASS3 cards,1 constraint, validation PASS |
| pnpm test:browser | PASS10: original6 +4 new desktop/mobile mocked-ASR tests;4 opt-in Live project cases skipped/NOT_RUN in this ordinary invocation |
| configured CODESWITCH_LIVE_ASR=1 pnpm speech:live | PASS2/2 desktop: one real transcription→reviewed export, one real worker cancellation |
| git diff --check | PASS |

The10 non-live browser passes and2 separately executed Live desktop passes are separate evidence. Mobile Live ASR, Firefox, Safari and real mobile devices were not run. CI/mock tests never synthesize Live success; no new hosted Actions run or remote push occurred.

New tests cover PCM/container/hash/size/duration validation; unavailable/missing model, timeout/cancel, malformed/empty/identity-mismatched response; omitted confidence; correction replay and stale confirmation; mixed Chinese/English/date/multi-intent/email-unknown/negation text integration; immutable UTF-16 evidence and corrected-source labels; confirmed-only export/tamper rejection; storage corruption/quota behavior; cross-origin/Host rejection; URL-payload refusal; cancelled late-response exclusion; unsafe markup as text; workspace replacement consent; mobile wrapping and reload/export. Mock transcripts validate engineering flow only, not speech accuracy.

## Actual Live audio and recognition

Source: original sentence spoken offline by installed Microsoft David Desktop SAPI. It is real synthetic spoken audio, not a human recording or third-party corpus. Source text/generator are retained; WAV is ignored and not committed. No expected text/prompt is passed to Whisper.

- Audio SHA-256: b5ea9d94f81ad97ad0a14551b48d862195c6076ec271665c046f428af76c433d.
- WAV155,086 bytes,4.845s,mono PCM16 at16000Hz.
- Runtime: existing Windows Whisper20240930 / large-v3 / PyTorch2.4.1+cu118, explicitly CPU. GPU ASR NO; CUDA availability False.
- Final actual recognition duration49,144.977838ms, including process/import/model load and recognition, excluding human review.
- Raw ASR (verbatim JSON string): `" Check sandbox credentials Do not deploy to production"`
- Explicit simulated-human whitespace/punctuation correction: `Check sandbox credentials. Do not deploy to production.`
- One Task; prohibited deploy/production preserved; corrected-source UTF-16 span [27,54) matches `Do not deploy to production`.
- Transcript confirmation, individual card confirmation and real JSON download/validateExport all passed. Browser automation simulates explicit user clicks; the product never auto-confirms.
- Actual cancellation preserved the existing3-card workspace; after completion/cancel there were0 request directories and0 matching Windows workers in a readonly host query.

The initial Live run transcribed successfully but, without punctuation correction, deterministic parsing returned0 cards/1 unresolved segment. This was a safe and expected parser limitation, not evidence of no ASR. The test was updated to exercise the required human correction step, not to change the ASR answer, parser, validator or gold. A later length-framed/open-stdin interop revision failed/timed out; the final implementation closes stdin, uses a generated private WAV and a cancellation marker. It passed Live revalidation. These development failures are not hidden or mixed into an accuracy score; the final recorded execution is in reports/p3-live-smoke.json.

## P3C preliminary metrics and limits

For this single English synthetic fixture, literal case-sensitive CER is3/55 (5.45%) and whitespace-token WER2/8 (25%); CER counts one leading space plus two omitted periods; WER counts the two punctuation-attached token differences, not missing spoken words. Technical-term coverage is3/3 for sandbox credentials/deploy/production; this is not actual code-switch speech accuracy. Raw transcript→P0 constraint extraction is0/1 because the two clauses were not separated; corrected transcript preserves1/1. Raw card count0; reviewed card count1; reviewed end-to-end/export success1/1. The metrics interface keeps raw and corrected paths separate and zero denominators null.

No actual Chinese+English, unknown-recipient audio, relative-date audio, noisy/accented/multi-speaker or long-audio benchmark was run. Those text-flow requirements are covered with original/mock transcripts. CPU latency is high;120s intake limit is not a promise that every120s file completes under the300s worker deadline. Confidence/word timestamps are not provided. Local metadata is consistency/audit information, not a cryptographically authenticated recording. No Common Voice download, Hailo integration or unqualified LLM product feature was started.
