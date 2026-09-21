import { useEffect, useState } from 'react';
import type { ContentItem, Market } from '@komorebi/shared-types';
import { fetchReviewQueue, submitReview } from '../api';

export default function ReviewQueue() {
  const [market, setMarket] = useState<Market | 'all'>('all');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetchReviewQueue(market === 'all' ? undefined : market);
      setItems(res);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, [market]);

  function startEdit(item: ContentItem) {
    setEditingId(item.id);
    setDraft(item.scriptText ?? '');
  }

  async function approve(item: ContentItem) {
    try {
      await submitReview(item.id, {
        approved: true,
        edited_script: editingId === item.id ? draft : undefined,
        reviewed_by: 'dashboard-user',
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function reject(item: ContentItem) {
    if (!confirm(`Reject "${item.title}"? Item sẽ chuyển trạng thái 'failed'.`)) return;
    try {
      await submitReview(item.id, { approved: false, reviewed_by: 'dashboard-user' });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section>
      <h2>Hàng đợi kiểm duyệt</h2>
      <div className="tabs">
        {(['all', 'jp', 'kr'] as const).map((m) => (
          <button
            key={m}
            className={`tab ${market === m ? 'active' : ''}`}
            onClick={() => setMarket(m)}
          >
            {m === 'all' ? 'Tất cả' : m.toUpperCase()}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {items.length === 0 && <p className="muted">Không có item nào cần duyệt.</p>}

      {items.map((item) => {
        const crisisFlagged = (item.scriptMetadata as any)?.crisis_flagged;
        return (
          <div className="card" key={item.id}>
            <div className="row-header">
              <strong>
                [{item.market.toUpperCase()}] {item.title}
              </strong>
              <span className="badge">{item.segmentType}</span>
              {crisisFlagged && <span className="badge badge-danger">⚠ cần ưu tiên</span>}
            </div>
            <p className="muted">
              {item.scheduledDate.slice(0, 10)} · {item.timeSlot}
            </p>
            {editingId === item.id ? (
              <textarea
                className="script-editor"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={8}
              />
            ) : (
              <p className="script-preview">{item.scriptText}</p>
            )}
            <div className="actions">
              {editingId === item.id ? (
                <button className="button" onClick={() => setEditingId(null)}>
                  Huỷ sửa
                </button>
              ) : (
                <button className="button" onClick={() => startEdit(item)}>
                  Sửa script
                </button>
              )}
              <button className="button button-primary" onClick={() => approve(item)}>
                Approve
              </button>
              <button className="button button-danger" onClick={() => reject(item)}>
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
