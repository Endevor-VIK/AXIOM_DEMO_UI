// AXIOM_DEMO_UI — WEB CORE
// Canvas: C20 — components/NewsCard.tsx
// Purpose: Present a single news item with kind/date/tags, summary and deeplink button.

import React from 'react';
import type { NewsItem } from '@/lib/vfs';

export default function NewsCard({ item }: { item: NewsItem }){
  return (
    <article className="news-card" aria-labelledby={`news-${item.id}`}>
      <header className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 id={`news-${item.id}`} className="news-title">{item.title}</h3>
        <small>{item.date}</small>
      </header>
      <div className="news-meta">
        <span className="news-kind" aria-label="Тип записи">{item.kind}</span>
        {item.tags?.length ? (
          <div className="news-tags" aria-label="Теги">
            {item.tags.map(t => <span key={t} className="ax-tag">{t}</span>)}
          </div>
        ) : null}
      </div>
      {item.summary && <p style={{ marginTop: '.35rem' }}>{item.summary}</p>}
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: '.35rem' }}>
        <a className="ax-btn" href={item.link || '#'}>{item.link ? 'Открыть' : 'Подробнее скоро'}</a>
      </div>
    </article>
  );
}
