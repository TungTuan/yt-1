import { prisma } from '../../db';
import { hasYouTubeCredentials } from './client';
import { markPublishedItems, scheduledPublishAt, uploadContentToYouTube } from './upload';

let timer: NodeJS.Timeout | null = null;
let running = false;

export async function runYouTubeUploadSweep(): Promise<{ uploaded: string[]; skipped: string[]; errors: string[] }> {
  if (running) return { uploaded: [], skipped: ['sweep_already_running'], errors: [] };
  running = true;
  const uploaded: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  try {
    await markPublishedItems();
    const lookaheadHours = Number(process.env.YOUTUBE_UPLOAD_LOOKAHEAD_HOURS ?? 168);
    const cutoff = Date.now() + lookaheadHours * 3_600_000;
    const items = await prisma.contentItem.findMany({
      where: { status: 'rendered', youtubeVideoId: null },
      orderBy: [{ scheduledDate: 'asc' }, { timeSlot: 'asc' }],
    });

    for (const item of items) {
      if (!hasYouTubeCredentials(item.market)) {
        skipped.push(`${item.id}:missing_${item.market}_credentials`);
        continue;
      }
      const publishAt = scheduledPublishAt(item).getTime();
      if (publishAt > cutoff) {
        skipped.push(`${item.id}:outside_lookahead`);
        continue;
      }
      try {
        await uploadContentToYouTube(item.id);
        uploaded.push(item.id);
      } catch (error) {
        errors.push(`${item.id}:${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return { uploaded, skipped, errors };
  } finally {
    running = false;
  }
}

export function startYouTubeUploadScheduler(): void {
  if (process.env.YOUTUBE_AUTO_UPLOAD !== 'true' || timer) return;
  const intervalMinutes = Number(process.env.YOUTUBE_UPLOAD_SWEEP_MINUTES ?? 5);
  console.log(`[youtube] auto-upload enabled; sweep every ${intervalMinutes} minute(s)`);
  void runYouTubeUploadSweep().then((result) => console.log('[youtube] initial sweep', result));
  timer = setInterval(() => {
    void runYouTubeUploadSweep().then((result) => {
      if (result.uploaded.length || result.errors.length) console.log('[youtube] sweep', result);
    });
  }, Math.max(1, intervalMinutes) * 60_000);
}
