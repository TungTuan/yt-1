import fs from 'fs';
import path from 'path';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { getBundleLocation } from './bundleCache';

const STORAGE_ROOT = path.resolve(__dirname, '..', '..', '..', 'storage');

/**
 * TICKET-010: renders one video (long-form or Shorts — same worker, different composition id
 * and prop shape) to storage/video/{market}/{filename}.mp4.
 */
export async function renderVideo(
  compositionId: 'LongForm' | 'Shorts',
  market: string,
  filename: string,
  inputProps: Record<string, unknown>,
): Promise<string> {
  const serveUrl = await getBundleLocation();

  const composition = await selectComposition({ serveUrl, id: compositionId, inputProps });

  const outDir = path.join(STORAGE_ROOT, 'video', market);
  fs.mkdirSync(outDir, { recursive: true });
  const outputLocation = path.join(outDir, filename);

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await renderMedia({
        composition,
        serveUrl,
        codec: 'h264',
        // CRF 23 is visually transparent for this mostly-static illustrated format while avoiding
        // the ~9 Mbps files produced by the renderer default. Stereo narration does not benefit
        // from an oversized audio stream either.
        crf: 23,
        audioBitrate: '192k',
        outputLocation,
        inputProps,
        // Complex long-form frames (rain + particles + subtitles + overlays) occasionally exceed
        // Remotion's 30s default under CPU pressure. A single slow frame should not kill a 5-10
        // minute render. Multi-scene videos preload several high-resolution backgrounds on the
        // first frame, so allow up to five minutes while queue concurrency remains fixed at 1.
        timeoutInMilliseconds: 300_000,
      });
      return outputLocation;
    } catch (err) {
      lastError = err;
      console.warn(`[render] ${filename} attempt ${attempt}/2 failed:`, err);
    }
  }
  throw lastError;
}
