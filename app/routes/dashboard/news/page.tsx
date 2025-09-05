// AXIOM_DEMO_UI — WEB CORE
// Canvas: C19 — app/routes/dashboard/news/page.tsx
// Purpose: News panel — renders news list from manifest with filters, pagination and deeplinks.

import React, { useEffect, useMemo, useState } from 'react';
import { vfs, type NewsItem, type NewsKind } from '@/lib/vfs';
import NewsCard from '@/components/NewsCard';

const KINDS: NewsKind[] = ['update', 'release', 'roadmap', 'heads-up'];

export default function NewsPage(){
  const [items, setItems] = useState<NewsItem[]>([]);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'' | NewsKind>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setBusy(true);
        const list = await vfs.readNewsManifest();
        if (alive){ setItems(list); setErr(null); }
      } catch (e:any) {
        if (alive) setErr(e?.message || 'Не удалось загрузить новости');
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter(it => {
      const okQ = !term || it.title.toLowerCase().includes(term) || (it.summary||'').toLowerCase().includes(term) || it.tags?.some(t => t.toLowerCase().includes(term));
      const okK = !kind || it.kind === kind;
      return okQ && okK;
    });
  }, [q, kind, items]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  return (
    <div className="container" aria-busy={busy}>
      <h2>Новости</h2>
      {err && <div className="ax-err" role="alert">{err}</div>}

      <div className="row" style={{ gap: '.75rem', margin: '.5rem 0 1rem', flexWrap: 'wrap' }}>
        <input
          className="ax-input"
          placeholder="Поиск по заголовку/тегам/описанию…"
          value={q}
          onChange={e=>setQ(e.target.value)}
          aria-label="Поиск"
          style={{ minWidth: 260 }}
        />
        <select className="ax-input" value={kind} onChange={e=>setKind(e.target.value as any)} aria-label="Фильтр по типу">
          <option value="">Все типы</option>
          {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <select className="ax-input" value={pageSize} onChange={e=>setPageSize(parseInt(e.target.value, 10))} aria-label="Размер страницы">
          {[5,10,20,50].map(n => <option key={n} value={n}>{n} / стр</option>)}
        </select>
        <span className="ax-tag">Всего: {items.length}</span>
        <span className="ax-tag">Отфильтровано: {filtered.length}</span>
      </div>

      <div className="news-grid">
        {pageItems.map(it => (
          <NewsCard key={it.id} item={it} />
        ))}
      </div>

      {/* Pagination */}
      <div className="row" style={{ gap: '.5rem', justifyContent: 'center', marginTop: '1rem' }}>
        <button className="ax-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Назад</button>
        <span className="ax-tag">{page} / {totalPages}</span>
        <button className="ax-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Вперёд</button>
      </div>
    </div>
  );
}
