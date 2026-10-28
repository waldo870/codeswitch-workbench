import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { HailoHealthRequest, HailoTranscribeRequest, HailoWorkerRequest } from '../contracts/hailo-worker.js';
import { HAILO_WORKER_MAX_REQUEST_BYTES, HAILO_WORKER_MAX_RESPONSE_BYTES, HAILO_WORKER_TIMEOUT_MS } from '../contracts/hailo-worker.js';
import { SpeechError } from './audio.js';
import type { HailoWorkerClient } from './hailo.js';

const workerScript = fileURLToPath(new URL('./hailo-worker-contract.py', import.meta.url));

/** Subprocess wrapper for the explicitly named --mock worker only. It has no HailoRT code path. */
export class PythonHailoMockWorkerClient implements HailoWorkerClient {
  readonly executionMode = 'mock' as const;
  constructor(private readonly pythonExecutable = 'python3', private readonly timeoutMs = HAILO_WORKER_TIMEOUT_MS) {}

  health(request: HailoHealthRequest, signal?: AbortSignal): Promise<unknown> { return this.call(request, signal); }
  transcribe(request: HailoTranscribeRequest, signal?: AbortSignal): Promise<unknown> { return this.call(request, signal); }

  private call(request: HailoWorkerRequest, signal?: AbortSignal): Promise<unknown> {
    const input = Buffer.from(JSON.stringify(request) + '\n');
    if (input.length > HAILO_WORKER_MAX_REQUEST_BYTES) return Promise.reject(new SpeechError('TOO_LARGE', 'Hailo worker request exceeds its size limit.'));
    return new Promise((resolve, reject) => {
      if (signal?.aborted) { reject(new SpeechError('CANCELLED', 'Hailo worker request was cancelled.')); return; }
      const child = spawn(this.pythonExecutable, [workerScript, '--mock'], { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      const chunks: Buffer[] = [];
      let length = 0;
      let settled = false;
      let failure: Error | undefined;
      const finish = (error?: Error, value?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        if (error) reject(error); else resolve(value);
      };
      const cancel = () => { failure = new SpeechError('CANCELLED', 'Hailo worker request was cancelled.'); child.kill('SIGTERM'); };
      const timer = setTimeout(() => { failure = new SpeechError('TIMEOUT', 'Hailo worker request timed out.'); child.kill('SIGTERM'); }, this.timeoutMs);
      signal?.addEventListener('abort', cancel, { once: true });
      child.stdout.on('data', (chunk: Buffer) => {
        length += chunk.length;
        if (length > HAILO_WORKER_MAX_RESPONSE_BYTES) { failure = new SpeechError('WORKER_PROTOCOL', 'Hailo worker response exceeds its size limit.'); child.kill('SIGTERM'); return; }
        chunks.push(chunk);
      });
      child.stderr.on('data', () => { /* never log worker diagnostics or request content */ });
      child.stdin.on('error', () => { /* close/error is reported without exposing child details */ });
      child.on('error', () => finish(new SpeechError('UNAVAILABLE', 'Python Hailo mock worker could not start.')));
      child.on('close', code => {
        if (failure) { finish(failure); return; }
        if (code !== 0) { finish(new SpeechError('WORKER_ERROR', 'Python Hailo mock worker failed.')); return; }
        try {
          const text = Buffer.concat(chunks).toString('utf8').trim();
          const value: unknown = JSON.parse(text);
          finish(undefined, value);
        } catch { finish(new SpeechError('WORKER_PROTOCOL', 'Python Hailo worker returned invalid JSON.')); }
      });
      child.stdin.end(input);
    });
  }
}
