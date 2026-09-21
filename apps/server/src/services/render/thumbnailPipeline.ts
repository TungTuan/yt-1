import { prisma } from '../../db';
import { deriveThumbnailHooks, renderThumbnails } from './renderThumbnail';
import { selectAssets } from '../assetSelection';
import { assetUrl } from './mediaUrls';
import { SEGMENT_TAG_COLOR, type TimeSlot } from '@komorebi/shared-types';
import { exportRenderedThumbnails } from './exportVideo';

const TIME_SLOTS: Record<string, TimeSlot> = {
  SLOT_0700: '07:00', SLOT_1000: '10:00', SLOT_1200: '12:00', SLOT_1500: '15:00',
  SLOT_1900: '19:00', SLOT_2100: '21:00',
};

/** Generates thumbnails independently, so editors can review click appeal before video render. */
export async function regenerateThumbnails(contentId: string) {
  const item = await prisma.contentItem.findUnique({ where: { id: contentId } });
  if (!item) throw new Error(`content_item ${contentId} not found`);
  if (item.format !== 'long_form') throw new Error('Thumbnail regeneration only supports long_form items.');
  const assets = await selectAssets({
    market: item.market,
    segmentType: item.segmentType,
    format: 'long_form',
    scheduledDate: item.scheduledDate,
    timeSlot: TIME_SLOTS[item.timeSlot],
  });
  if (!assets.background || !assets.mascotPose) {
    throw new Error(`Không tìm thấy background/mascot phù hợp cho ${contentId}.`);
  }
  const hookTexts = deriveThumbnailHooks(item.market, item.title ?? '', item.segmentType, item.targetKeyword);
  const thumbnails = await renderThumbnails(item.id, item.market, {
    backgroundSrc: assetUrl(assets.background.filePath),
    mascotPoseSrc: assetUrl(assets.mascotPose.filePath),
    hookTexts,
    tagColor: SEGMENT_TAG_COLOR[item.segmentType],
  });
  const exportThumbnailPaths = exportRenderedThumbnails(
    thumbnails.allPaths,
    item.scheduledDate,
    item.market,
  );
  const metadata = { ...((item.scriptMetadata as Record<string, unknown>) ?? {}) };
  await prisma.contentItem.update({
    where: { id: item.id },
    data: {
      thumbnailPath: thumbnails.primaryPath,
      scriptMetadata: {
        ...metadata,
        thumbnail_hooks: hookTexts,
        thumbnail_paths: thumbnails.allPaths,
        export_thumbnail_paths: exportThumbnailPaths,
      } as never,
    },
  });
  return { ...thumbnails, hookTexts };
}
