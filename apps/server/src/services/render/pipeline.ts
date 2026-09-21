import { prisma } from '../../db';
import { ensureVoiced } from './ttsForContent';
import { buildLongFormProps, buildShortsProps } from './buildVideoProps';
import { renderVideo } from './renderVideo';
import { renderThumbnails, deriveThumbnailHooks } from './renderThumbnail';
import { storageUrl } from './mediaUrls';
import { checkDuration } from './durationTargets';
import { appendQuizTimestamps } from '../seo';
import { exportRenderedThumbnails, exportRenderedVideo } from './exportVideo';

/**
 * TICKET-010: end-to-end render for one content_item — voice (if not already synthesized) ->
 * asset selection -> Remotion render -> thumbnails. Long-form and Shorts share this pipeline;
 * Shorts additionally need their parent long-form item to already be `rendered` (TICKET-010 AC:
 * "Job Shorts chỉ bắt đầu render sau khi job video dài cùng ngày đã rendered thành công").
 */
export async function renderContentItem(contentId: string): Promise<void> {
  const item = await prisma.contentItem.findUnique({ where: { id: contentId } });
  if (!item) throw new Error(`content_item ${contentId} not found`);

  if (item.format === 'shorts') {
    if (!item.parentContentId) throw new Error(`Shorts item ${contentId} has no parent_content_id`);
    const parent = await prisma.contentItem.findUnique({ where: { id: item.parentContentId } });
    if (!parent) throw new Error(`Shorts item ${contentId}'s parent ${item.parentContentId} not found`);
    if (parent.status !== 'rendered' && parent.status !== 'uploaded' && parent.status !== 'published') {
      throw new Error(
        `Shorts item ${contentId} cannot render before its parent long-form item is rendered (parent status: ${parent.status})`,
      );
    }

    const voiced = await ensureVoiced(item);
    // The composition adds a 2s branded outro; cap narration so the final file meets the
    // 15–30s requirement in TICKET-009b.
    if (voiced.durationSeconds > 28) {
      const fresh = await prisma.contentItem.findUniqueOrThrow({ where: { id: item.id } });
      const metadata = { ...((fresh.scriptMetadata as Record<string, unknown>) ?? {}) };
      await prisma.contentItem.update({
        where: { id: item.id },
        data: {
          status: 'needs_review',
          scriptMetadata: {
            ...metadata,
            duration_warning: `Shorts narration is ${voiced.durationSeconds.toFixed(1)}s; maximum is 28s so the final video stays within 30s.`,
          } as never,
        },
      });
      return;
    }
    const props = await buildShortsProps(parent, item, voiced);
    const videoPath = await renderVideo('Shorts', item.market, `${item.id}.mp4`, props);
    const exportPath = exportRenderedVideo(videoPath, item.scheduledDate, item.market);
    await prisma.contentItem.update({
      where: { id: item.id },
      data: {
        videoPath,
        status: 'rendered',
        scriptMetadata: (await withoutRenderError(item.id, { export_path: exportPath })) as never,
      },
    });
    return;
  }

  const voiced = await ensureVoiced(item);

  // Duration guardrail: check the *voiced audio* against the segment's target before spending
  // 5-20 min rendering something that would need a script rewrite anyway. Sends the item back to
  // needs_review rather than silently letting it through to rendered/uploaded (2026-09-13 review).
  // Skipped once a human has explicitly approved the item (status: 'approved') — that approval is
  // authoritative, including a deliberate override of an earlier duration_warning; otherwise every
  // re-render of an approved-but-still-short item would just bounce straight back to needs_review,
  // silently discarding the human's decision (found 2026-09-14, this exact scenario).
  const durationCheck =
    item.status === 'approved' || item.status === 'rendered'
      ? { ok: true, target: null, message: null }
      : checkDuration(item.segmentType, voiced.durationSeconds);
  if (!durationCheck.ok) {
    const fresh = await prisma.contentItem.findUniqueOrThrow({ where: { id: item.id } });
    const metadata = { ...((fresh.scriptMetadata as Record<string, unknown>) ?? {}) };
    await prisma.contentItem.update({
      where: { id: item.id },
      data: {
        status: 'needs_review',
        scriptMetadata: { ...metadata, duration_warning: durationCheck.message } as never,
      },
    });
    return;
  }

  const props = await buildLongFormProps(item, voiced);
  const videoPath = await renderVideo('LongForm', item.market, `${item.id}.mp4`, props);
  const exportPath = exportRenderedVideo(videoPath, item.scheduledDate, item.market);

  const hookTexts = deriveThumbnailHooks(item.market, item.title ?? '', item.segmentType, item.targetKeyword);
  const thumbnails = await renderThumbnails(item.id, item.market, {
    backgroundSrc: props.backgroundSrc,
    mascotPoseSrc: props.mascotPoseSrc,
    hookTexts,
    tagColor: props.tagColor,
  });
  const exportThumbnailPaths = exportRenderedThumbnails(
    thumbnails.allPaths,
    item.scheduledDate,
    item.market,
  );

  await prisma.contentItem.update({
    where: { id: item.id },
    data: {
      videoPath,
      thumbnailPath: thumbnails.primaryPath,
      status: 'rendered',
      scriptMetadata: (await withoutRenderError(item.id, {
        thumbnail_hooks: hookTexts,
        thumbnail_paths: thumbnails.allPaths,
        export_path: exportPath,
        export_thumbnail_paths: exportThumbnailPaths,
      })) as never,
      ...(item.segmentType === 'quiz' && item.seoDescription
        ? { seoDescription: appendQuizTimestamps(item.seoDescription, voiced.captionCues) }
        : {}),
    },
  });
}

/**
 * Drops a previous attempt's render_error/duration_warning once a render actually succeeds.
 * Re-reads the row rather than reusing the pipeline's original `item` variable, which was
 * fetched before ensureVoiced() persisted captionCues/audioDurationSeconds — using the stale
 * copy here would silently wipe those back out.
 */
async function withoutRenderError(
  contentId: string,
  additions: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const fresh = await prisma.contentItem.findUniqueOrThrow({ where: { id: contentId } });
  const metadata = { ...((fresh.scriptMetadata as Record<string, unknown>) ?? {}) };
  delete metadata.render_error;
  delete metadata.duration_warning;
  return { ...metadata, ...additions };
}

export { storageUrl };
