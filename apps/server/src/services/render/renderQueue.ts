import { prisma } from '../../db';
import { renderContentItem } from './pipeline';

interface QueueItem {
  contentId: string;
  enqueuedAt: string;
}

const pending: QueueItem[] = [];
let active: (QueueItem & { startedAt: string }) | null = null;
let processing = false;

export function getRenderQueueStatus() {
  return { active, pending: [...pending], concurrency: 1 };
}

/**
 * `priority: true` moves the job to the FRONT of the queue instead of the back — used to let an
 * operator bump a specific item (e.g. one they want to manually upload sooner) ahead of a long
 * batch already queued, without having to cancel/re-enqueue everything else.
 */
export function enqueueRender(contentId: string, priority = false) {
  if (active?.contentId === contentId) return { accepted: false, reason: 'already_active', position: 0 };
  const existingIndex = pending.findIndex((item) => item.contentId === contentId);
  if (existingIndex >= 0) {
    if (priority && existingIndex > 0) {
      const [item] = pending.splice(existingIndex, 1);
      pending.unshift(item);
      return { accepted: true, reason: 'reprioritized', position: 1 };
    }
    return { accepted: false, reason: 'already_queued', position: existingIndex + 1 };
  }

  const entry = { contentId, enqueuedAt: new Date().toISOString() };
  if (priority) {
    pending.unshift(entry);
  } else {
    pending.push(entry);
  }
  const position = pending.indexOf(entry) + 1;
  void processQueue();
  return { accepted: true, position };
}

async function processQueue() {
  if (processing) return;
  processing = true;
  try {
    while (pending.length > 0) {
      const next = pending.shift()!;
      active = { ...next, startedAt: new Date().toISOString() };
      try {
        await renderContentItem(next.contentId);
      } catch (err) {
        console.error(`[render-queue] content_item ${next.contentId} failed:`, err);
        const existing = await prisma.contentItem.findUnique({ where: { id: next.contentId } }).catch(() => null);
        if (existing) {
          const metadata = (existing.scriptMetadata as Record<string, unknown>) ?? {};
          await prisma.contentItem.update({
            where: { id: next.contentId },
            data: {
              status: 'failed',
              scriptMetadata: { ...metadata, render_error: String((err as Error)?.message ?? err) } as never,
            },
          }).catch(() => undefined);
        }
      } finally {
        active = null;
      }
    }
  } finally {
    processing = false;
  }
}
