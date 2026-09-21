import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../db';
import { importWeeklyExcel } from '../services/excelImport';
import { buildWeeklyTemplateWorkbook } from '../services/excelTemplate';
import { containsCrisisKeyword } from '../config';
import { enqueueRender, getRenderQueueStatus } from '../services/render/renderQueue';
import { toMediaUrl } from '../services/render/mediaUrls';
import { regenerateThumbnails } from '../services/render/thumbnailPipeline';
import { runYouTubeUploadSweep } from '../services/youtube/scheduler';
import { uploadContentToYouTube } from '../services/youtube/upload';
import type { QualityReviewRequest, ReviewDecisionRequest } from '@komorebi/shared-types';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const contentRouter = Router();

/** Adds playable audioUrl/videoUrl/thumbnailUrl alongside the raw filesystem *Path fields, for
 * the dashboard to preview rendered output directly (TICKET-017 gap found 2026-09-14). */
function withMediaUrls<T extends { audioPath: string | null; videoPath: string | null; thumbnailPath: string | null; scriptMetadata?: unknown }>(
  item: T,
) {
  const metadata = (item.scriptMetadata ?? {}) as Record<string, unknown>;
  const thumbnailPaths = Array.isArray(metadata.thumbnail_paths)
    ? metadata.thumbnail_paths.filter((value): value is string => typeof value === 'string')
    : [];
  return {
    ...item,
    audioUrl: toMediaUrl(item.audioPath),
    videoUrl: toMediaUrl(item.videoPath),
    thumbnailUrl: toMediaUrl(item.thumbnailPath),
    thumbnailUrls: thumbnailPaths.map(toMediaUrl).filter((url): url is string => Boolean(url)),
  };
}

// --- TICKET-003b: Excel import ---

contentRouter.get('/template', async (_req, res, next) => {
  try {
    const wb = await buildWeeklyTemplateWorkbook();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="weekly-content-upload-template.xlsx"',
    );
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

contentRouter.post('/import-excel', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Thiếu file (field 'file')." });
    }
    const result = await importWeeklyExcel(req.file.buffer);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// --- Listing / calendar (TICKET-017 backend support) ---

contentRouter.get('/', async (req, res, next) => {
  try {
    const { market, status, from, to } = req.query as Record<string, string | undefined>;
    const items = await prisma.contentItem.findMany({
      where: {
        ...(market ? { market: market as any } : {}),
        ...(status ? { status: status as any } : {}),
        ...(from || to
          ? {
              scheduledDate: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ scheduledDate: 'asc' }, { timeSlot: 'asc' }],
    });
    res.json(items.map(withMediaUrls));
  } catch (err) {
    next(err);
  }
});

/**
 * Bulk delete, scoped by mandatory date range (+ optional market), so a batch of content_item
 * rows can be cleanly replaced by a fresh Excel import (there is no upsert-on-import — TICKET-003b
 * import is additive-insert only). Both `from` and `to` are required on purpose: this must never
 * be callable without an explicit bound, to avoid an accidental full-table wipe.
 */
contentRouter.delete('/', async (req, res, next) => {
  try {
    const { market, from, to } = req.query as Record<string, string | undefined>;
    if (!from || !to) {
      return res.status(400).json({ error: "Cần truyền 'from' và 'to' (YYYY-MM-DD) để giới hạn phạm vi xoá." });
    }
    const result = await prisma.contentItem.deleteMany({
      where: {
        ...(market ? { market: market as any } : {}),
        scheduledDate: { gte: new Date(from), lte: new Date(to) },
      },
    });
    res.json({ deletedCount: result.count });
  } catch (err) {
    next(err);
  }
});

/**
 * Re-attaches already-rendered media (video/audio/thumbnail paths + status + timing metadata) to
 * a content_item — used after a fresh Excel re-import creates new rows (with new ids) for content
 * whose script_text didn't change, so a prior render's hours of work aren't wasted on a re-render.
 * Does NOT trigger any rendering itself, only updates DB pointers to files that already exist.
 */
contentRouter.patch('/:id/restore-media', async (req, res, next) => {
  try {
    const { videoPath, audioPath, thumbnailPath, status, scriptMetadataPatch } = req.body as {
      videoPath?: string; audioPath?: string; thumbnailPath?: string; status?: string; scriptMetadataPatch?: Record<string, unknown>;
    };
    const existing = await prisma.contentItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy content_item.' });
    const metadata = { ...(existing.scriptMetadata as Record<string, unknown>), ...(scriptMetadataPatch ?? {}) };
    const updated = await prisma.contentItem.update({
      where: { id: existing.id },
      data: {
        ...(videoPath !== undefined ? { videoPath } : {}),
        ...(audioPath !== undefined ? { audioPath } : {}),
        ...(thumbnailPath !== undefined ? { thumbnailPath } : {}),
        ...(status !== undefined ? { status: status as any } : {}),
        scriptMetadata: metadata as never,
      },
    });
    res.json(withMediaUrls(updated));
  } catch (err) {
    next(err);
  }
});

// --- Review queue (TICKET-005) ---

contentRouter.get('/review-queue', async (req, res, next) => {
  try {
    const { market } = req.query as Record<string, string | undefined>;
    const items = await prisma.contentItem.findMany({
      where: { status: 'needs_review', ...(market ? { market: market as any } : {}) },
      orderBy: [{ createdAt: 'asc' }],
    });
    // High-priority (crisis-flagged) items surface first.
    const sorted = [...items].sort((a, b) => {
      const aHigh = (a.scriptMetadata as any)?.priority === 'high' ? 1 : 0;
      const bHigh = (b.scriptMetadata as any)?.priority === 'high' ? 1 : 0;
      return bHigh - aHigh;
    });
    res.json(sorted.map(withMediaUrls));
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/render-queue/status', (_req, res) => {
  res.json(getRenderQueueStatus());
});

// --- TICKET-012: YouTube upload/schedule ---

contentRouter.post('/youtube/upload-sweep', async (_req, res, next) => {
  try {
    res.json(await runYouTubeUploadSweep());
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/quality-review', async (req, res, next) => {
  try {
    const { market } = req.query as Record<string, string | undefined>;
    const items = await prisma.contentItem.findMany({
      where: {
        ...(market ? { market: market as any } : {}),
        format: 'long_form',
        OR: [{ factualQaPassed: false }, { languageQaPassed: false }],
      },
      orderBy: [{ scheduledDate: 'asc' }, { timeSlot: 'asc' }],
    });
    res.json(items.map(withMediaUrls));
  } catch (err) {
    next(err);
  }
});

contentRouter.patch('/:id/quality-review', async (req, res, next) => {
  try {
    const body = req.body as QualityReviewRequest;
    const existing = await prisma.contentItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy content_item.' });
    const sources = (body.fact_sources ?? []).map((url) => url.trim()).filter(Boolean);
    const sourceRequired = existing.segmentType === 'morning_news' || existing.segmentType === 'nostalgia';
    if (body.factual_qa_passed && sourceRequired && sources.length === 0) {
      return res.status(400).json({ error: 'Morning news/nostalgia cần ít nhất một source URL trước khi pass factual QA.' });
    }
    const updated = await prisma.contentItem.update({
      where: { id: existing.id },
      data: {
        factSources: sources,
        factualQaPassed: Boolean(body.factual_qa_passed),
        languageQaPassed: Boolean(body.language_qa_passed),
        qaNotes: body.qa_notes?.trim() || null,
        qaReviewedBy: body.reviewed_by ?? 'dashboard-user',
        qaReviewedAt: new Date(),
      },
    });
    res.json(withMediaUrls(updated));
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.contentItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Không tìm thấy content_item.' });
    res.json(withMediaUrls(item));
  } catch (err) {
    next(err);
  }
});

contentRouter.patch('/:id/review', async (req, res, next) => {
  try {
    const body = req.body as ReviewDecisionRequest;
    const existing = await prisma.contentItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy content_item.' });
    if (existing.status !== 'needs_review') {
      return res.status(400).json({ error: `Item đang ở trạng thái '${existing.status}', không phải 'needs_review'.` });
    }

    if (body.approved) {
      const finalScript = body.edited_script ?? existing.scriptText ?? '';
      const metadata = { ...(existing.scriptMetadata as any) };
      if (containsCrisisKeyword(existing.market, finalScript)) {
        metadata.crisis_flagged = true;
        metadata.priority = 'high';
      }
      const updated = await prisma.contentItem.update({
        where: { id: existing.id },
        data: {
          status: 'approved',
          scriptText: finalScript,
          scriptMetadata: metadata,
          reviewedBy: body.reviewed_by ?? 'unknown',
        },
      });
      return res.json(updated);
    }

    const metadata = { ...(existing.scriptMetadata as any), rejection_reason: body.rejection_reason };
    const updated = await prisma.contentItem.update({
      where: { id: existing.id },
      data: {
        status: 'failed',
        scriptMetadata: metadata,
        reviewedBy: body.reviewed_by ?? 'unknown',
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// --- TICKET-010: render pipeline (voice -> asset selection -> Remotion -> thumbnails) ---

contentRouter.post('/:id/render', async (req, res, next) => {
  try {
    const item = await prisma.contentItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Không tìm thấy content_item.' });
    // 'scripted' = non-sensitive content that skipped needs_review entirely; 'approved' = passed
    // human review; 'voiced'/'failed'/'rendered' = retry or re-render after a script fix (e.g.
    // the duration guardrail in pipeline.ts sent it back to needs_review, then it was re-approved).
    if (!['scripted', 'approved', 'voiced', 'failed', 'rendered'].includes(item.status)) {
      return res.status(400).json({
        error: `Item đang ở trạng thái '${item.status}' — không thể render (cần 'scripted' trở lên, hoặc đã qua review).`,
      });
    }
    const priority = req.query.priority === 'true' || req.query.priority === '1';
    const queued = enqueueRender(item.id, priority);
    res.status(202).json({ started: queued.accepted, id: item.id, ...queued });
  } catch (err) {
    next(err);
  }
});

contentRouter.post('/:id/youtube-upload', async (req, res, next) => {
  try {
    const result = await uploadContentToYouTube(req.params.id);
    res.status(201).json({
      id: req.params.id,
      youtubeVideoId: result.videoId,
      youtubePublishAt: result.publishAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

contentRouter.post('/:id/thumbnails', async (req, res, next) => {
  try {
    res.json(await regenerateThumbnails(req.params.id));
  } catch (err) {
    next(err);
  }
});
