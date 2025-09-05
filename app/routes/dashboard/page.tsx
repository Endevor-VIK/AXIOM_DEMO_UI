// AXIOM_DEMO_UI — WEB CORE
// Canvas: C15 — app/routes/dashboard/page.tsx
// Purpose: Protected dashboard shell with quick stats and shortcuts to panels; previews latest news.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { vfs, type NewsItem } from '@/lib/vfs';

interface Counts { audits: number; content: number; news: number; }

export default function DashboardPage(){
  const [counts, setCounts] = useState<Counts>({ audits: 0, content: 0, news: 0 });
  const [latest, setLatest] = useState<NewsItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setBusy(true);
        const [aud, cont, news] = await Promise.allSettled([
          vfs.readAuditsManifest(),
          vfs.readContentManifest(),
          vfs.readNewsManifest(),
        ]);
        const audits = aud.status === 'fulfilled' && Array.isArray(aud.value) ? aud.value.length : 0;
        const content = cont.status === 'fulfilled' && Array.isArray(cont.value) ? cont.value.length : 0;
        const newsArr = news.status === 'fulfilled' && Array.isArray(news.value) ? news.value as NewsItem[] : [];
        if (alive) {
          setCounts({ audits, content, news: newsArr.length });
          setLatest(newsArr.slice(0, 3));
          setErr(null);
        }
      } catch (e:any) {
        if (alive) setErr(e?.message || 'Не удалось загрузить данные');
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="container" aria-busy={busy} aria-live="polite">
      <h2>Dashboard</h2>
      {err && <div className="ax-err" role="alert">{err}</div>}

      <div className="grid" style={{ marginTop: '1rem' }}>
        {/* Quick Stats */}
        <section className="card ax-card" aria-label="Краткая статистика">
          <h3>Статус</h3>
          <div className="row" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <span className="ax-tag" title="Аудиты">AUDIT: {counts.audits}</span>
            <span className="ax-tag" title="Контент">CONTENT: {counts.content}</span>
            <span className="ax-tag" title="Новости">NEWS: {counts.news}</span>
          </div>
          <div className="hr" />
          <div className="row" style={{ gap: '.5rem', flexWrap: 'wrap' }}>
            <Link to="/dashboard/roadmap" className="ax-btn">Открыть Roadmap</Link>
            <Link to="/dashboard/audit" className="ax-btn">Открыть Audit</Link>
            <Link to="/dashboard/content" className="ax-btn">Открыть Content</Link>
            <Link to="/dashboard/news" className="ax-btn primary">Что нового</Link>
          </div>
        </section>

        {/* Latest News */}
        <section className="card ax-card" aria-label="Последние новости">
          <h3>Последние новости</h3>
          {latest.length === 0 && <small>Записей пока нет. Перейдите во вкладку NEWS, чтобы добавить.</small>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '.75rem' }}>
            {latest.map(item => (
              <li key={item.id} className="news-card">
                <div className="news-title">{item.title}</div>
                <div className="news-meta">
                  <span className="news-kind">{item.kind}</span>
                  <span>{item.date}</span>
                  {item.tags?.map(t => <span className="ax-tag" key={t}>{t}</span>)}
                </div>
                {item.summary && <p style={{ marginTop: '.35rem' }}>{item.summary}</p>}
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <Link to={item.link || '/dashboard/news'} className="ax-btn">Открыть</Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
