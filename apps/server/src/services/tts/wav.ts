/**
 * Minimal PCM WAV (RIFF) read/write/concat — no external dependency. Used to splice VOICEVOX's
 * per-segment output back together around [PAUSE] markers (TICKET-006 AC).
 */

export interface WavData {
  sampleRate: number;
  numChannels: number;
  bitsPerSample: number;
  /** Raw PCM sample bytes (no header). */
  data: Buffer;
}

/** Scans RIFF chunks rather than assuming fixed offsets, so it tolerates extra chunks (e.g. LIST). */
export function parseWav(buffer: Buffer): WavData {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Not a RIFF/WAVE buffer');
  }

  let offset = 12;
  let fmt: { sampleRate: number; numChannels: number; bitsPerSample: number } | null = null;
  let data: Buffer | null = null;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (chunkId === 'fmt ') {
      fmt = {
        numChannels: buffer.readUInt16LE(chunkStart + 2),
        sampleRate: buffer.readUInt32LE(chunkStart + 4),
        bitsPerSample: buffer.readUInt16LE(chunkStart + 14),
      };
    } else if (chunkId === 'data') {
      data = buffer.subarray(chunkStart, chunkStart + chunkSize);
    }

    offset = chunkStart + chunkSize + (chunkSize % 2); // chunks are word-aligned
  }

  if (!fmt || !data) throw new Error('WAV buffer missing fmt or data chunk');
  return { ...fmt, data };
}

export function buildWav(wav: WavData): Buffer {
  const { sampleRate, numChannels, bitsPerSample, data } = wav;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // PCM fmt chunk size
  header.writeUInt16LE(1, 20); // AudioFormat = PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

export function silenceData(seconds: number, wav: Pick<WavData, 'sampleRate' | 'numChannels' | 'bitsPerSample'>): Buffer {
  const bytesPerSample = wav.bitsPerSample / 8;
  const frameCount = Math.round(seconds * wav.sampleRate);
  return Buffer.alloc(frameCount * wav.numChannels * bytesPerSample, 0);
}

export function durationSeconds(wav: WavData): number {
  const bytesPerFrame = (wav.numChannels * wav.bitsPerSample) / 8;
  return wav.data.length / bytesPerFrame / wav.sampleRate;
}

/**
 * Concatenates same-format WAV segments with `pauseSeconds` of silence between each — used to
 * turn [PAUSE]-split script segments back into one file while tracking each segment's timing.
 */
export function concatWavSegments(
  segments: Buffer[],
  pauseSeconds: number,
): { buffer: Buffer; segmentTimings: { startSeconds: number; endSeconds: number }[] } {
  if (segments.length === 0) throw new Error('concatWavSegments: no segments');

  const parsed = segments.map(parseWav);
  const { sampleRate, numChannels, bitsPerSample } = parsed[0];
  for (const p of parsed) {
    if (p.sampleRate !== sampleRate || p.numChannels !== numChannels || p.bitsPerSample !== bitsPerSample) {
      throw new Error('concatWavSegments: all segments must share the same format');
    }
  }

  const silence = silenceData(pauseSeconds, { sampleRate, numChannels, bitsPerSample });
  const dataParts: Buffer[] = [];
  const segmentTimings: { startSeconds: number; endSeconds: number }[] = [];
  let cursorSeconds = 0;

  parsed.forEach((p, i) => {
    if (i > 0) {
      dataParts.push(silence);
      cursorSeconds += pauseSeconds;
    }
    const segDuration = durationSeconds(p);
    segmentTimings.push({ startSeconds: cursorSeconds, endSeconds: cursorSeconds + segDuration });
    dataParts.push(p.data);
    cursorSeconds += segDuration;
  });

  const buffer = buildWav({ sampleRate, numChannels, bitsPerSample, data: Buffer.concat(dataParts) });
  return { buffer, segmentTimings };
}
