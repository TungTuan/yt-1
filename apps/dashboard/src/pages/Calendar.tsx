import { useEffect, useState, type ReactNode } from 'react';
import type { ContentItem, Market } from '@komorebi/shared-types';
import {
  enqueueContentRender,
  fetchContentList,
  fetchRenderQueueStatus,
  regenerateContentThumbnails,
  type RenderQueueStatus,
} from '../api';

const STATUS_COLORS: Record<string, string> = {
  queued: '#9ca3af',
  scripted: '#60a5fa',
  needs_review: '#f59e0b',
  approved: '#34d399',
  voiced: '#38bdf8',
  rendered: '#a78bfa',
  uploaded: '#4ade80',
  published: '#22c55e',
  failed: '#f87171',
};

export default function Calendar() {
  const [market, setMarket] = useState<Market>('jp');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<RenderQueueStatus>({ active: null, pending: [], concurrency: 1 });
  const [renderMessage, setRenderMessage] = useState<string | null>(null);
  const [thumbnailMessage, setThumbnailMessage] = useState<string | null>(null);
  const [thumbnailBusy, setThumbnailBusy] = useState(false);

  function updateItems(nextItems: ContentItem[]) {
    setItems(nextItems);
    setSelected((current) => current
      ? nextItems.find((item) => item.id === current.id) ?? current
      : null);
  }

  useEffect(() => {
    fetchContentList({ market })
      .then(updateItems)
      .catch((err) => setError((err as Error).message));
  }, [market]);

  useEffect(() => {
    const refresh = () => {
      fetchRenderQueueStatus().then(setQueue).catch((err) => setError((err as Error).message));
      fetchContentList({ market }).then(updateItems).catch(() => undefined);
    };
    refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => window.clearInterval(timer);
  }, [market]);

  const titleFor = (id: string) => items.find((item) => item.id === id)?.title ?? id;

  async function requestRender(item: ContentItem) {
    setRenderMessage(null);
    try {
      const result = await enqueueContentRender(item.id);
      setRenderMessage(
        result.accepted
          ? `Đã thêm “${item.title}” vào hàng đợi (vị trí ${result.position}).`
          : `Không thêm trùng: ${result.reason ?? 'đã có trong queue'}.`,
      );
      setQueue(await fetchRenderQueueStatus());
    } catch (err) {
      setRenderMessage((err as Error).message);
    }
  }

  async function requestThumbnails(item: ContentItem) {
    setThumbnailBusy(true);
    setThumbnailMessage(null);
    try {
      const result = await regenerateContentThumbnails(item.id);
      const refreshed = await fetchContentList({ market });
      updateItems(refreshed);
      setThumbnailMessage('Đã tạo thumbnail SEO gồm hook tiêu đề, target keyword và lợi ích cảm xúc.');
    } catch (err) {
      setThumbnailMessage((err as Error).message);
    } finally {
      setThumbnailBusy(false);
    }
  }

  const byDate = items.reduce<Record<string, ContentItem[]>>((acc, item) => {
    const key = item.scheduledDate.slice(0, 10);
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  return (
    <section>
      <h2>Lịch nội dung</h2>
      <div className="tabs">
        {(['jp', 'kr'] as const).map((m) => (
          <button
            key={m}
            className={`tab ${market === m ? 'active' : ''}`}
            onClick={() => setMarket(m)}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="card queue-card">
        <div className="row-header">
          <strong>Render queue</strong>
          <span className="badge">concurrency 1</span>
        </div>
        {queue.active ? (
          <p>Đang render: <strong>{titleFor(queue.active.contentId)}</strong></p>
        ) : (
          <p className="muted">Không có job đang chạy.</p>
        )}
        <p className="muted">Đang chờ: {queue.pending.length}</p>
        {queue.pending.length > 0 && (
          <ol className="queue-list">
            {queue.pending.map((job) => <li key={job.contentId}>{titleFor(job.contentId)}</li>)}
          </ol>
        )}
        {renderMessage && <p className="muted">{renderMessage}</p>}
      </div>

      {error && <p className="error">{error}</p>}
      {Object.keys(byDate).length === 0 && <p className="muted">Chưa có content_item nào.</p>}

      {Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, dayItems]) => (
          <div className="card" key={date}>
            <strong>{date}</strong>
            <div className="chip-row">
              {dayItems
                .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
                .map((item) => (
                  <button
                    key={item.id}
                    className="chip"
                    style={{ borderColor: STATUS_COLORS[item.status] ?? '#ccc' }}
                    onClick={() => {
                      setSelected(item);
                      setThumbnailMessage(null);
                    }}
                  >
                    {item.timeSlot} · {item.segmentType}
                    {item.format === 'shorts' ? ' 🩳' : ''}
                    <span className="chip-status" style={{ color: STATUS_COLORS[item.status] }}>
                      {item.status}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ))}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-heading">
              <h3>{selected.title}</h3>
              <button className="modal-close" aria-label="Đóng" onClick={() => setSelected(null)}>×</button>
            </div>
            <p className="muted">
              {selected.market.toUpperCase()} · {selected.segmentType} · {selected.timeSlot} ·{' '}
              {selected.status}
            </p>

            <section className="detail-section">
              <h4>SEO metadata</h4>
              <dl className="metadata-list">
                <dt>Target keyword</dt>
                <CopyableValue value={selected.targetKeyword ?? ''}>
                  {selected.targetKeyword || '—'}
                </CopyableValue>
                <dt>SEO title</dt>
                <CopyableValue value={selected.seoTitle ?? ''}>
                  {selected.seoTitle || '—'}
                </CopyableValue>
                <dt>SEO description</dt>
                <CopyableValue value={selected.seoDescription ?? ''} contentClassName="pre-wrap">
                  {selected.seoDescription || '—'}
                </CopyableValue>
                <dt>SEO tags</dt>
                <CopyableValue value={selected.seoTags.join(', ')}>
                  <TagList values={selected.seoTags} />
                </CopyableValue>
                <dt>Hashtags</dt>
                <CopyableValue value={metadataStrings(selected, 'hashtags').map(normalizeHashtag).join(' ')}>
                  <TagList values={metadataStrings(selected, 'hashtags')} prefix="#" />
                </CopyableValue>
              </dl>
            </section>

            <section className="detail-section">
              <div className="section-heading">
                <h4>Thumbnail SEO</h4>
                <button
                  className="button button-primary"
                  disabled={thumbnailBusy || selected.format !== 'long_form'}
                  onClick={() => requestThumbnails(selected)}
                >
                  {thumbnailBusy ? 'Đang generate…' : selected.thumbnailUrl ? 'Generate lại' : 'Generate thumbnail'}
                </button>
              </div>
              <p className="muted">Một ảnh, ba lớp: keyword · hook tiêu đề nổi bật · cảm xúc/lợi ích.</p>
              {thumbnailMessage && <p className="notice">{thumbnailMessage}</p>}
              <ThumbnailGallery item={selected} />
            </section>

            <section className="detail-section">
              <h4>Video / audio</h4>

            {selected.videoUrl ? (
              <video
                key={selected.id}
                controls
                poster={selected.thumbnailUrl ?? undefined}
                src={selected.videoUrl}
                style={{ width: '100%', maxHeight: 480, background: '#000' }}
              />
            ) : selected.audioUrl ? (
              // Voiced but not yet rendered to video — still useful to preview the TTS pass.
              <audio key={selected.id} controls src={selected.audioUrl} style={{ width: '100%' }} />
            ) : (
              <p className="muted">Chưa có video/audio để xem trước (trạng thái: {selected.status}).</p>
            )}
            </section>

            <section className="detail-section">
              <h4>Thông tin đầy đủ</h4>
            <dl className="metadata-list">
              <dt>Ngày đăng</dt>
              <dd>{selected.scheduledDate.slice(0, 10)} · {selected.timeSlot}</dd>
              <dt>Format / source</dt>
              <dd>{selected.format} · {selected.source}</dd>
              <dt>QA</dt>
              <dd>Factual: {selected.factualQaPassed ? 'PASS' : '—'} · Language: {selected.languageQaPassed ? 'PASS' : '—'}</dd>
              <dt>QA notes</dt>
              <dd>{selected.qaNotes || '—'}</dd>
              <dt>Audio</dt>
              <dd>{selected.audioPath ?? '—'}</dd>
              <dt>Video</dt>
              <dd>{selected.videoPath ?? '—'}</dd>
              <dt>Thumbnail</dt>
              <dd>{selected.thumbnailPath ?? '—'}</dd>
              <dt>YouTube</dt>
              <dd>{selected.youtubeVideoId ?? '—'}</dd>
            </dl>
            </section>

            <section className="detail-section">
              <h4>Kịch bản đầy đủ</h4>
              <p className="script-preview">{selected.scriptText || '—'}</p>
            </section>

            <div className="modal-actions">
            <button className="button" onClick={() => setSelected(null)}>
              Đóng
            </button>
            <button className="button button-primary" onClick={() => requestRender(selected)}>
              Render / render lại
            </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function metadataStrings(item: ContentItem, key: string): string[] {
  const value = item.scriptMetadata?.[key];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function normalizeHashtag(value: string): string {
  return `#${value.replace(/^#/, '')}`;
}

function CopyableValue({
  value,
  children,
  contentClassName = '',
}: {
  value: string;
  children: ReactNode;
  contentClassName?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <dd className="copyable-value">
      <span className={`copyable-content ${contentClassName}`}>{children}</span>
      <button className="copy-button" disabled={!value} onClick={copy} type="button">
        {copied ? 'Đã copy' : 'Copy'}
      </button>
    </dd>
  );
}

function TagList({ values, prefix = '' }: { values: string[]; prefix?: string }) {
  if (values.length === 0) return <>—</>;
  return <span className="tag-list">{values.map((value) => (
    <span className="tag-pill" key={value}>{prefix}{value.replace(/^#/, '')}</span>
  ))}</span>;
}

function ThumbnailGallery({ item }: { item: ContentItem }) {
  const urls = item.thumbnailUrls?.length ? item.thumbnailUrls : item.thumbnailUrl ? [item.thumbnailUrl] : [];
  const hooks = metadataStrings(item, 'thumbnail_hooks');
  if (urls.length === 0) return <p className="muted">Chưa có thumbnail.</p>;
  return <div className="thumbnail-grid">
    {urls.map((url, index) => (
      <figure className="thumbnail-card" key={url}>
        <img src={url} alt="SEO thumbnail" />
        <figcaption><strong>SEO thumbnail</strong>{hooks.length ? ` · ${hooks.join(' · ')}` : ''}</figcaption>
      </figure>
    ))}
  </div>;
}
