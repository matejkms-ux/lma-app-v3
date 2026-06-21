// @ts-expect-error — lamejs ships CJS with no type declarations
import { Mp3Encoder } from 'lamejs';

const KBPS = 96;
const CHUNK = 1152; // lamejs processes in chunks of exactly 1152 PCM samples

/**
 * Decode an arbitrary audio Blob (webm, mp4, ogg…) to PCM via the Web Audio
 * API, then encode to MP3 at 96 kbps using lamejs.  Returns the original blob
 * unchanged if anything fails so the upload path always has something to send.
 */
export async function encodeToMp3(blob: Blob): Promise<Blob> {
  try {
    const arrayBuf = await blob.arrayBuffer();
    const ctx = new AudioContext();
    let decoded: AudioBuffer;
    try {
      decoded = await ctx.decodeAudioData(arrayBuf);
    } finally {
      void ctx.close();
    }

    const channels = Math.min(decoded.numberOfChannels, 2) as 1 | 2;
    const sampleRate = decoded.sampleRate;
    const encoder = new Mp3Encoder(channels, sampleRate, KBPS) as {
      encodeBuffer: (l: Int16Array, r: Int16Array) => Int8Array;
      flush: () => Int8Array;
    };

    const leftF32 = decoded.getChannelData(0);
    const rightF32 = channels === 2 ? decoded.getChannelData(1) : leftF32;
    const total = leftF32.length;
    const parts: BlobPart[] = [];

    for (let offset = 0; offset < total; offset += CHUNK) {
      const end = Math.min(offset + CHUNK, total);
      const left = f32ToI16(leftF32.subarray(offset, end));
      const right = f32ToI16(rightF32.subarray(offset, end));
      const chunk = encoder.encodeBuffer(left, right);
      if (chunk.length > 0) parts.push(toArrayBuffer(chunk));
    }

    const tail = encoder.flush();
    if (tail.length > 0) parts.push(toArrayBuffer(tail));

    return new Blob(parts, { type: 'audio/mpeg' });
  } catch {
    return blob;
  }
}

function toArrayBuffer(i8: Int8Array): ArrayBuffer {
  const buf = new ArrayBuffer(i8.length);
  new Uint8Array(buf).set(new Uint8Array(i8.buffer, i8.byteOffset, i8.byteLength));
  return buf;
}

function f32ToI16(f32: Float32Array): Int16Array {
  const i16 = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return i16;
}
