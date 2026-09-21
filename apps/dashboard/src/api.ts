import type {
  ContentItem,
  ExcelImportResult,
  Market,
  ReviewDecisionRequest,
  QualityReviewRequest,
} from '@komorebi/shared-types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export function templateDownloadUrl(): string {
  return '/api/content/template';
}

export async function uploadExcel(file: File): Promise<ExcelImportResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/content/import-excel', { method: 'POST', body: form });
  return json(res);
}

export async function fetchContentList(params: {
  market?: Market;
  status?: string;
  from?: string;
  to?: string;
}): Promise<ContentItem[]> {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  );
  const res = await fetch(`/api/content?${qs.toString()}`);
  return json(res);
}

export async function fetchReviewQueue(market?: Market): Promise<ContentItem[]> {
  const qs = market ? `?market=${market}` : '';
  const res = await fetch(`/api/content/review-queue${qs}`);
  return json(res);
}

export interface RenderQueueStatus {
  active: { contentId: string; enqueuedAt: string; startedAt: string } | null;
  pending: Array<{ contentId: string; enqueuedAt: string }>;
  concurrency: 1;
}

export async function fetchRenderQueueStatus(): Promise<RenderQueueStatus> {
  return json(await fetch('/api/content/render-queue/status'));
}

export async function fetchQualityReview(market?: Market): Promise<ContentItem[]> {
  const qs = market ? `?market=${market}` : '';
  return json(await fetch(`/api/content/quality-review${qs}`));
}

export async function submitQualityReview(id: string, body: QualityReviewRequest): Promise<ContentItem> {
  return json(await fetch(`/api/content/${id}/quality-review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

export async function enqueueContentRender(id: string): Promise<{
  started: boolean;
  accepted: boolean;
  position: number;
  reason?: string;
}> {
  return json(await fetch(`/api/content/${id}/render`, { method: 'POST' }));
}

export async function regenerateContentThumbnails(id: string): Promise<{
  primaryPath: string;
  allPaths: string[];
  hookTexts: [string, string, string];
}> {
  return json(await fetch(`/api/content/${id}/thumbnails`, { method: 'POST' }));
}

export async function submitReview(
  id: string,
  body: ReviewDecisionRequest,
): Promise<ContentItem> {
  const res = await fetch(`/api/content/${id}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return json(res);
}
