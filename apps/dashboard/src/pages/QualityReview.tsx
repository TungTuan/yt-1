import { useEffect, useState } from 'react';
import type { ContentItem, Market } from '@komorebi/shared-types';
import { fetchQualityReview, submitQualityReview } from '../api';

export default function QualityReview() {
  const [market, setMarket] = useState<Market>('jp');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { sources: string; notes: string }>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try { setItems(await fetchQualityReview(market)); } catch (err) { setError((err as Error).message); }
  }
  useEffect(() => { void load(); }, [market]);

  async function save(item: ContentItem, factual: boolean, language: boolean) {
    const draft = drafts[item.id] ?? { sources: item.factSources.join('\n'), notes: item.qaNotes ?? '' };
    try {
      await submitQualityReview(item.id, {
        factual_qa_passed: factual,
        language_qa_passed: language,
        fact_sources: draft.sources.split('\n').map((value) => value.trim()).filter(Boolean),
        qa_notes: draft.notes,
        reviewed_by: 'dashboard-user',
      });
      await load();
    } catch (err) { setError((err as Error).message); }
  }

  return <section>
    <h2>Factual & native-language QA</h2>
    <div className="tabs">{(['jp', 'kr'] as const).map((m) => <button key={m} className={`tab ${market === m ? 'active' : ''}`} onClick={() => setMarket(m)}>{m.toUpperCase()}</button>)}</div>
    {error && <p className="error">{error}</p>}
    {items.length === 0 && <p className="muted">Tất cả nội dung đã qua QA.</p>}
    {items.map((item) => {
      const draft = drafts[item.id] ?? { sources: item.factSources.join('\n'), notes: item.qaNotes ?? '' };
      return <div className="card" key={item.id}>
        <div className="row-header"><strong>{item.title}</strong><span className="badge">{item.segmentType}</span></div>
        <p className="muted">{item.scheduledDate.slice(0, 10)} · Fact: {item.factualQaPassed ? '✅' : '—'} · Language: {item.languageQaPassed ? '✅' : '—'}</p>
        <label>Source URLs, mỗi dòng một URL</label>
        <textarea className="script-editor" rows={3} value={draft.sources} onChange={(e) => setDrafts({ ...drafts, [item.id]: { ...draft, sources: e.target.value } })} />
        <label>QA notes</label>
        <textarea className="script-editor" rows={2} value={draft.notes} onChange={(e) => setDrafts({ ...drafts, [item.id]: { ...draft, notes: e.target.value } })} />
        <div className="actions">
          <button className="button" onClick={() => save(item, true, item.languageQaPassed)}>Pass factual</button>
          <button className="button button-primary" onClick={() => save(item, item.factualQaPassed, true)}>Pass native language</button>
          <button className="button button-primary" onClick={() => save(item, true, true)}>Pass both</button>
        </div>
      </div>;
    })}
  </section>;
}
