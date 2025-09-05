// AXIOM_DEMO_UI — WEB CORE
// Canvas: C22 — components/Ticker.tsx
// Purpose: Top-line news ticker showing N latest items (stable layout, optional marquee animation handled by CSS).

import React, { useEffect, useState } from 'react';
import { vfs, type NewsItem } from '@/lib/vfs';

export interface TickerProps {
  maxItems?: number; // default 3
}

export default function Ticker({ maxItems = 3 }: TickerProps){
  const [items, setItems] = useState<NewsItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await vfs.readNewsManifest();
        if (!alive) return;
        setItems(list.slice(0, Math.max(1, maxItems)));
        setErr(null);
      } catch (e:any) {
        if (!alive) return;
        setErr(e?.message || 'Ошибка чтения ленты');
      }
    })();
    return () => { alive = false; };
  }, [maxItems]);

  if (err) return <div className="ticker"><small className="ax-err">{err}</small></div>;
  if (items.length === 0) return <div className="ticker"><small className="ax-muted">Нет новостей</small></div>;

  return (
    <div className="ticker" role="feed" aria-busy={false}>
      <div className="ticker-track">
        {items.map(it => (
          <div key={it.id} className="ticker-item">
            <span className="ticker-kind">{it.kind}</span>
            <span>{it.title}</span>
          </div>
        ))}
        {/* duplicate once for smooth loop */}
        {items.map(it => (
          <div key={it.id + '-dup'} className="ticker-item" aria-hidden>
            <span className="ticker-kind">{it.kind}</span>
            <span>{it.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
