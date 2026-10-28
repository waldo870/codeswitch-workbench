"""Trusted Windows worker: private WAV input, bounded JSON stdout, no network."""
import sys, os, io, wave, json, contextlib, threading, hashlib, time
sys.stdout.reconfigure(encoding='utf-8')
deadline=threading.Timer(300, lambda: os._exit(124))
deadline.daemon=True
deadline.start()
# Numba's optional coverage plugin is incompatible with this existing installation.
# Disable instrumentation in this child only; no package/system files are modified.
sys.modules['coverage'] = None
if len(sys.argv) != 3 or not os.path.isabs(sys.argv[1]) or not os.path.isfile(sys.argv[1]) or not sys.argv[1].lower().endswith('.pt'):
    sys.exit(20)
def cancellation_monitor():
    # Request-scoped marker avoids streaming-stdin issues in Windows/WSL interop.
    cancel_file=os.path.join(os.path.dirname(sys.argv[2]), 'cancel')
    while True:
        if os.path.exists(cancel_file):
            os._exit(125)
        time.sleep(0.1)
threading.Thread(target=cancellation_monitor, daemon=True).start()
try:
    if not os.path.isabs(sys.argv[2]) or not sys.argv[2].lower().endswith('.wav'):
        os._exit(21)
    with open(sys.argv[2], 'rb') as audio:
        data=audio.read(4_000_001)
    if len(data)>4_000_000:
        os._exit(21)
    with wave.open(io.BytesIO(data), 'rb') as f:
        if f.getnchannels()!=1 or f.getsampwidth()!=2 or f.getframerate()!=16000 or f.getnframes()>16000*120:
            os._exit(21)
        pcm=f.readframes(f.getnframes())
    # Loading an existing absolute .pt file prevents Whisper's model downloader.
    with contextlib.redirect_stdout(sys.stderr):
        import numpy as np, whisper, torch
        torch.set_num_threads(8)
        load_started=time.perf_counter()
        model = whisper.load_model(sys.argv[1], device='cpu')
        model_load_ms=(time.perf_counter()-load_started)*1000
        transcription_started=time.perf_counter()
        result = model.transcribe(np.frombuffer(pcm, dtype=np.int16).astype(np.float32)/32768.0, fp16=False, verbose=None, task='transcribe')
        transcription_ms=(time.perf_counter()-transcription_started)*1000
    print(json.dumps({'sourceAudioId':'sha256:'+hashlib.sha256(data).hexdigest(),'text': result['text'], 'language': result.get('language'), 'model':os.path.basename(sys.argv[1])[:-3], 'provider':'windows-whisper','device':'cpu','modelLoadDurationMs':model_load_ms,'transcriptionDurationMs':transcription_ms}, ensure_ascii=False), flush=True)
except Exception:
    # Never print private audio/text, paths or provider stack traces.
    os._exit(22)


# Exit only this worker after flushing its single JSON result.
os._exit(0)
