import fs from 'fs';
import path from 'path';
import type { Market } from '@komorebi/shared-types';
import { VoicevoxAdapter } from './voicevoxAdapter';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for the swap-back once real Typecast creds exist
import { TypecastAdapter } from './typecastAdapter';
import { EdgeTtsAdapter } from './edgeTtsAdapter';
import { concatWavSegments } from './wav';
import type { TtsAdapter, TtsResult } from './types';

/** Silence inserted at each [PAUSE] marker (TICKET-006 AC: consistent behavior across engines). */
const PAUSE_SECONDS = 0.6;

const STORAGE_ROOT = path.resolve(process.env.AUDIO_STORAGE_DIR ?? path.join(__dirname, '..', '..', '..', 'storage', 'audio'));

// market=kr TEMPORARILY uses EdgeTtsAdapter (free, no key) instead of TypecastAdapter until
// TYPECAST_API_KEY + TYPECAST_VOICE_ID are configured — see edgeTtsAdapter.ts's doc comment.
const adapters: Record<Market, () => TtsAdapter> = {
  jp: () => new VoicevoxAdapter(),
  kr: () => new EdgeTtsAdapter(),
};

/**
 * TICKET-006: `ttsService.synthesize(market, scriptText) → {audio_path, timing_data}`. Splits on
 * [PAUSE] markers, synthesizes each segment through the market's adapter, and stitches the
 * results back into one WAV file with a consistent silence gap — so [PAUSE] behaves the same way
 * regardless of which engine's native pause mechanism (or lack thereof) sits underneath.
 */
export async function synthesize(market: Market, contentId: string, scriptText: string): Promise<TtsResult> {
  const segments = scriptText
    .split('[PAUSE]')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (segments.length === 0) {
    throw new Error('synthesize: script_text has no non-empty content after splitting on [PAUSE]');
  }

  const adapter = adapters[market]();
  // Keep synthesis sequential. Long scripts can contain dozens of segments; firing every
  // VOICEVOX request concurrently caused the local engine to exceed memory and exit with 137.
  const wavBuffers: Buffer[] = [];
  for (const segment of segments) {
    wavBuffers.push(await adapter.synthesizeSegment(segment));
  }

  // Works for a single segment too (no pause inserted, timing is just that segment's own span).
  const { buffer, segmentTimings } = concatWavSegments(wavBuffers, PAUSE_SECONDS);

  const dir = path.join(STORAGE_ROOT, market);
  fs.mkdirSync(dir, { recursive: true });
  const audioPath = path.join(dir, `${contentId}.wav`);
  fs.writeFileSync(audioPath, buffer);

  const timingData = segments.map((text, i) => ({
    text,
    startSeconds: segmentTimings[i].startSeconds,
    endSeconds: segmentTimings[i].endSeconds,
  }));

  const durationSeconds = timingData[timingData.length - 1].endSeconds;

  return { audioPath, durationSeconds, timingData };
}

export * from './types';
