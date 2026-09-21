import fs from 'fs';
import type { ContentItem } from '@prisma/client';
import { prisma } from '../../db';
import { createYouTubeClient } from './client';

const SLOT_HOUR: Record<string, number> = {
  SLOT_0700: 7,
  SLOT_1000: 10,
  SLOT_1200: 12,
  SLOT_1500: 15,
  SLOT_1900: 19,
  SLOT_2100: 21,
};

/** JP and KR channels currently publish in UTC+9. YouTube expects an RFC3339 timestamp. */
export function scheduledPublishAt(item: Pick<ContentItem, 'scheduledDate' | 'timeSlot'>): Date {
  const date = item.scheduledDate.toISOString().slice(0, 10);
  const hour = SLOT_HOUR[item.timeSlot];
  if (hour === undefined) throw new Error(`Unknown time slot: ${item.timeSlot}`);
  return new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+09:00`);
}

function uploadMetadata(item: ContentItem) {
  const title = (item.seoTitle || item.title || '').trim();
  if (!title) throw new Error(`Content ${item.id} chưa có seo_title/title.`);
  if (!item.seoDescription?.trim()) throw new Error(`Content ${item.id} chưa có seo_description.`);
  return { title: title.slice(0, 100), description: item.seoDescription, tags: item.seoTags.slice(0, 30) };
}

async function assertReady(item: ContentItem): Promise<void> {
  if (item.status !== 'rendered') throw new Error(`Content ${item.id} có status=${item.status}, cần rendered.`);
  if (!item.videoPath || !fs.existsSync(item.videoPath)) throw new Error(`Không tìm thấy video render: ${item.videoPath}`);
  if (item.youtubeVideoId) throw new Error(`Content ${item.id} đã có youtube_video_id=${item.youtubeVideoId}.`);

  if (item.format === 'shorts') {
    const parent = item.parentContentId
      ? await prisma.contentItem.findUnique({ where: { id: item.parentContentId } })
      : null;
    if (!parent?.factualQaPassed || !parent.languageQaPassed) {
      throw new Error(`Shorts ${item.id} chưa có parent vượt qua factual/language QA.`);
    }
  } else if (!item.factualQaPassed || !item.languageQaPassed) {
    throw new Error(`Content ${item.id} chưa vượt qua factual/language QA.`);
  }
}

/**
 * Uploads exactly once from the app's perspective. upload_in_progress is intentionally retained
 * after an uncertain API failure so the scheduler cannot create a duplicate; an operator must
 * reconcile the channel and clear the flag before retrying.
 */
export async function uploadContentToYouTube(contentId: string): Promise<{ videoId: string; publishAt: Date }> {
  const item = await prisma.contentItem.findUnique({ where: { id: contentId } });
  if (!item) throw new Error(`Content ${contentId} not found.`);
  await assertReady(item);

  const metadata = { ...((item.scriptMetadata as Record<string, unknown>) ?? {}) };
  if (metadata.youtube_upload_in_progress) {
    throw new Error(`Content ${contentId} có upload lock; kiểm tra YouTube Studio trước khi retry để tránh đăng trùng.`);
  }

  const publishAt = scheduledPublishAt(item);
  if (publishAt.getTime() <= Date.now() + 10 * 60_000) {
    throw new Error(`publishAt ${publishAt.toISOString()} phải cách hiện tại ít nhất 10 phút.`);
  }

  await prisma.contentItem.update({
    where: { id: item.id },
    data: {
      scriptMetadata: {
        ...metadata,
        youtube_upload_in_progress: true,
        youtube_upload_started_at: new Date().toISOString(),
      } as never,
    },
  });

  const youtube = createYouTubeClient(item.market);
  const info = uploadMetadata(item);
  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: info.title,
        description: info.description,
        tags: info.tags,
        categoryId: '22',
        defaultLanguage: item.market === 'jp' ? 'ja' : 'ko',
        defaultAudioLanguage: item.market === 'jp' ? 'ja' : 'ko',
      },
      status: {
        privacyStatus: 'private',
        publishAt: publishAt.toISOString(),
        selfDeclaredMadeForKids: false,
      },
    },
    media: { body: fs.createReadStream(item.videoPath!) },
  });

  const videoId = response.data.id;
  if (!videoId) throw new Error(`YouTube upload không trả về video id cho content ${item.id}.`);

  // Persist the remote ID before any secondary operation. If thumbnail upload fails, a later
  // sweep must not insert the already-created video a second time.
  delete metadata.youtube_upload_in_progress;
  delete metadata.youtube_upload_started_at;
  await prisma.contentItem.update({
    where: { id: item.id },
    data: {
      youtubeVideoId: videoId,
      youtubePublishAt: publishAt,
      status: 'uploaded',
      scriptMetadata: { ...metadata, youtube_thumbnail_set: false } as never,
    },
  });

  if (item.thumbnailPath && fs.existsSync(item.thumbnailPath)) {
    try {
      await youtube.thumbnails.set({ videoId, media: { body: fs.createReadStream(item.thumbnailPath) } });
      await prisma.contentItem.update({
        where: { id: item.id },
        data: { scriptMetadata: { ...metadata, youtube_thumbnail_set: true } as never },
      });
    } catch (error) {
      await prisma.contentItem.update({
        where: { id: item.id },
        data: {
          scriptMetadata: {
            ...metadata,
            youtube_thumbnail_set: false,
            youtube_thumbnail_error: error instanceof Error ? error.message : String(error),
          } as never,
        },
      });
    }
  }

  return { videoId, publishAt };
}

export async function markPublishedItems(): Promise<number> {
  const result = await prisma.contentItem.updateMany({
    where: { status: 'uploaded', youtubePublishAt: { lte: new Date() } },
    data: { status: 'published' },
  });
  return result.count;
}
