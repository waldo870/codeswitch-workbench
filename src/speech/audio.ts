import type { AudioSource, SpeechErrorCode } from '../contracts/speech.js';
export const MAX_AUDIO_BYTES = 4_000_000;
export const MAX_AUDIO_SECONDS = 120;
export class SpeechError extends Error { constructor(public code: SpeechErrorCode, message: string) { super(message); } }
export function inspectWav(bytes: Uint8Array, name: string): Omit<AudioSource, 'id'> {
 if (!/\.wav$/i.test(name)) throw new SpeechError('FORMAT', 'Only WAV files are supported.');
 if (bytes.length > MAX_AUDIO_BYTES) throw new SpeechError('TOO_LARGE', 'Audio exceeds 4 MB.');
 const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
 const text = (offset: number, length: number) => String.fromCharCode(...bytes.subarray(offset, offset + length));
 if (bytes.length < 44 || text(0,4) !== 'RIFF' || text(8,4) !== 'WAVE' || view.getUint32(4,true) + 8 !== bytes.length) throw new SpeechError('CORRUPTED_AUDIO', 'Invalid or truncated WAV container.');
 let fmt = false, dataBytes = -1;
 for (let pos = 12; pos + 8 <= bytes.length;) {
  const size = view.getUint32(pos+4,true), end = pos + 8 + size;
  if (end > bytes.length) throw new SpeechError('CORRUPTED_AUDIO', 'Truncated WAV chunk.');
  const kind = text(pos,4);
  if (kind === 'fmt ') {
   if (fmt || size < 16) throw new SpeechError('CORRUPTED_AUDIO','Invalid WAV format chunk.');
   if (view.getUint16(pos+8,true)!==1 || view.getUint16(pos+10,true)!==1 || view.getUint32(pos+12,true)!==16000 || view.getUint16(pos+20,true)!==2 || view.getUint16(pos+22,true)!==16 || view.getUint32(pos+16,true)!==32000) throw new SpeechError('FORMAT','Use PCM WAV, mono, 16-bit, 16000 Hz.');
   fmt = true;
  }
  if (kind === 'data') { if (dataBytes !== -1 || size === 0 || size % 2) throw new SpeechError('CORRUPTED_AUDIO','Invalid WAV audio data.'); dataBytes = size; }
  pos = end + (size % 2);
  if (pos > bytes.length || (pos < bytes.length && pos + 8 > bytes.length)) throw new SpeechError('CORRUPTED_AUDIO','Invalid WAV trailing bytes.');
 }
 if (!fmt || dataBytes <= 0) throw new SpeechError('CORRUPTED_AUDIO','WAV format/audio chunks are missing.');
 const duration = dataBytes / 32000;
 if (duration > MAX_AUDIO_SECONDS) throw new SpeechError('TOO_LONG','Audio exceeds 120 seconds.');
 return { name: name.split(/[\\/]/).at(-1)!.slice(0,200), bytes: bytes.length, duration, format:'wav', sampleRate:16000, channels:1, bitsPerSample:16 };
}
export async function identifyAudio(bytes: Uint8Array, name: string): Promise<AudioSource> {
 const info = inspectWav(bytes,name);
 const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer);
 return { ...info, id:'sha256:' + [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('') };
}
