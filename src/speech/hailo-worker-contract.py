"""P4 Hailo worker protocol endpoint. Default mode is unavailable; --mock never calls HailoRT."""
import argparse
import base64
import hashlib
import json
import re
import sys
import time
import wave
from io import BytesIO

PROTOCOL = "codeswitch.hailo-asr.v1"
MAX_AUDIO_BYTES = 4_000_000
MAX_REQUEST_BYTES = 5_500_000
MAX_RESPONSE_BYTES = 64_000
MODEL_IDS = {"whisper-base", "whisper-tiny"}
FORMAT = {"container": "wav", "encoding": "pcm_s16le", "sampleRateHz": 16000, "channels": 1, "bitsPerSample": 16}


def response(value):
    encoded = json.dumps(value, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    if len(encoded) > MAX_RESPONSE_BYTES:
        encoded = json.dumps({"protocol": PROTOCOL, "status": "error", "errorCode": "WORKER_ERROR"}).encode("ascii")
    sys.stdout.buffer.write(encoded + b"\n")
    sys.stdout.buffer.flush()


def invalid(request_id, operation, code, mock):
    return {"protocol": PROTOCOL, "requestId": request_id, "operation": operation, "status": "error", "executionMode": "mock" if mock else "live", "providerId": "hailo-10h", "modelId": "whisper-base", "sourceAudioId": "", "audioSha256": "", "errorCode": code}


def handle(value, mock):
    if not isinstance(value, dict) or value.get("protocol") != PROTOCOL or not isinstance(value.get("requestId"), str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", value["requestId"]):
        return {"protocol": PROTOCOL, "requestId": "invalid", "operation": "health", "status": "hardware-unavailable", "providerId": "hailo-10h", "deviceDetected": False, "errorCode": "WORKER_ERROR"}
    rid = value["requestId"]
    if value.get("operation") == "health" and set(value) == {"protocol", "requestId", "operation"}:
        if mock:
            return {"protocol": PROTOCOL, "requestId": rid, "operation": "health", "status": "mock-only", "providerId": "hailo-10h", "deviceDetected": False}
        return {"protocol": PROTOCOL, "requestId": rid, "operation": "health", "status": "hardware-unavailable", "providerId": "hailo-10h", "deviceDetected": False, "errorCode": "HARDWARE_UNAVAILABLE"}
    required = {"protocol", "requestId", "operation", "providerId", "modelId", "sourceAudioId", "audioFormat", "audioBase64"}
    if value.get("operation") != "transcribe" or set(value) != required:
        return invalid(rid, "transcribe", "WORKER_PROTOCOL", mock)
    if value["providerId"] != "hailo-10h" or value["modelId"] not in MODEL_IDS or not isinstance(value["sourceAudioId"], str) or not re.fullmatch(r"sha256:[0-9a-f]{64}", value["sourceAudioId"]):
        return invalid(rid, "transcribe", "WORKER_PROTOCOL", mock)
    if value["audioFormat"] != FORMAT or not isinstance(value["audioBase64"], str) or len(value["audioBase64"]) > ((MAX_AUDIO_BYTES + 2) // 3) * 4:
        return invalid(rid, "transcribe", "FORMAT", mock)
    try:
        raw = base64.b64decode(value["audioBase64"], validate=True)
        if not raw or len(raw) > MAX_AUDIO_BYTES:
            return invalid(rid, "transcribe", "TOO_LARGE" if len(raw) > MAX_AUDIO_BYTES else "CORRUPTED_AUDIO", mock)
        digest = hashlib.sha256(raw).hexdigest()
        if "sha256:" + digest != value["sourceAudioId"]:
            return invalid(rid, "transcribe", "CORRUPTED_AUDIO", mock)
        with wave.open(BytesIO(raw), "rb") as source:
            valid = source.getnchannels() == 1 and source.getsampwidth() == 2 and source.getframerate() == 16000 and 0 < source.getnframes() <= 16000 * 120
        if not valid:
            return invalid(rid, "transcribe", "FORMAT", mock)
    except (ValueError, wave.Error, EOFError):
        return invalid(rid, "transcribe", "CORRUPTED_AUDIO", mock)
    if not mock:
        return {"protocol": PROTOCOL, "requestId": rid, "operation": "transcribe", "status": "error", "executionMode": "live", "providerId": "hailo-10h", "modelId": value["modelId"], "sourceAudioId": value["sourceAudioId"], "audioSha256": digest, "errorCode": "HARDWARE_UNAVAILABLE"}
    started = time.perf_counter()
    # Deliberately fixed sentinel. It is useful only for protocol tests and is not ASR output.
    transcript = "MOCK ONLY — no Hailo inference was performed."
    elapsed_ms = (time.perf_counter() - started) * 1000.0
    return {"protocol": PROTOCOL, "requestId": rid, "operation": "transcribe", "status": "success", "executionMode": "mock", "providerId": "hailo-10h", "modelId": value["modelId"], "sourceAudioId": value["sourceAudioId"], "audioSha256": digest, "transcript": transcript, "language": None, "inferenceDurationMs": elapsed_ms}


def main():
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--mock", action="store_true")
    args, unknown = parser.parse_known_args()
    if unknown:
        response({"protocol": PROTOCOL, "requestId": "invalid", "operation": "health", "status": "hardware-unavailable", "providerId": "hailo-10h", "deviceDetected": False, "errorCode": "WORKER_PROTOCOL"})
        return
    line = sys.stdin.buffer.readline(MAX_REQUEST_BYTES + 1)
    trailing = sys.stdin.buffer.read(1)
    if not line or len(line) > MAX_REQUEST_BYTES or not line.endswith(b"\n") or trailing:
        response({"protocol": PROTOCOL, "requestId": "invalid", "operation": "health", "status": "hardware-unavailable", "providerId": "hailo-10h", "deviceDetected": False, "errorCode": "WORKER_PROTOCOL"})
        return
    try:
        value = json.loads(line)
    except (json.JSONDecodeError, UnicodeDecodeError):
        response({"protocol": PROTOCOL, "requestId": "invalid", "operation": "health", "status": "hardware-unavailable", "providerId": "hailo-10h", "deviceDetected": False, "errorCode": "WORKER_PROTOCOL"})
        return
    response(handle(value, args.mock))


if __name__ == "__main__":
    main()
