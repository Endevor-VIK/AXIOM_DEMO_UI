import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ROADMAP_HTML, getHtml, isRenderableHtml, ensureTrailingSlash } from '@/app/lib/htmlMaps';
import { ErrorBlock } from '@/components/ErrorBlock';
import RouteHoldBanner from '@/components/RouteHoldBanner';
import { isRoadmapDisabled } from '@/lib/featureFlags';
import '@/app/styles/red-protocol-overrides.css';

export default function RoadmapRoute() {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const roadmapDisabled = isRoadmapDisabled;

  const dataBase = useMemo(
    () => ensureTrailingSlash(((import.meta as any)?.env?.VITE_DATA_BASE as string) ?? 'data/'),
    []
  );

  useEffect(() => {
    let alive = true;
    if (roadmapDisabled) {
      setHtml(null);
      setErr(null);
      setLoading(false);
      return () => {
        alive = false;
      };
    }
    setLoading(true);
    setErr(null);

    const bundled = getHtml(ROADMAP_HTML, '/AXIOM_SYSTEM_V2__ROADMAP.html');

    async function load() {
      // 1) если бандл содержит валидный HTML
      if (isRenderableHtml(bundled)) {
        if (!alive) return;
        setHtml(bundled!);
        setLoading(false);
        return;
      }
      // 2) фолбэк — fetch из public
      try {
        const res = await fetch(dataBase + 'roadmap/index.html', { cache: 'no-cache' });
        const text = await res.text();
        if (!alive) return;
        if (isRenderableHtml(text)) {
          setHtml(text);
          setErr(null);
        } else {
          setHtml(null);
          setErr('Пустой HTML (только комментарии) в источнике.');
        }
      } catch (e: any) {
        if (!alive) return;
        setHtml(null);
        setErr(e?.message || 'Не удалось загрузить Roadmap.');
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [dataBase, roadmapDisabled]);

  function expandAll() {
    if (!containerRef.current) return;
    containerRef.current.querySelectorAll<HTMLDetailsElement>('details').forEach(d => (d.open = true));
  }
  function collapseAll() {
    if (!containerRef.current) return;
    containerRef.current
      .querySelectorAll<HTMLDetailsElement>('details')
      .forEach(d => { d.open = false; });
  }

  // Применение фильтра к DOM
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const q = filter.trim().toLowerCase();
    // Сброс
    root.querySelectorAll<HTMLElement>('[data-hidden="true"]').forEach(el => el.removeAttribute('data-hidden'));
    if (!q) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>('li, details'));
    items.forEach(el => {
      const txt = el.textContent?.toLowerCase() || '';
      if (txt.includes(q)) {
        // раскрываем всех предков details
        let p = el.parentElement;
        while (p) {
          if (p instanceof HTMLDetailsElement) p.open = true;
          p = p.parentElement;
        }
      } else {
        el.setAttribute('data-hidden', 'true');
      }
    });
  }, [filter, html]);

  if (roadmapDisabled) {
    return (
      <RouteHoldBanner
        title="ROADMAP временно закрыт"
        message="Раздел отключён для полной переработки и дизайнерских обновлений."
        note="В ближайших релизах roadmap будет заменён новым модулем."
      />
    );
  }

  return (
    <section className="ax-card ax-viewer ax-viewer--roadmap">
      <div className="ax-viewer__toolbar">
        <input
          aria-label="Поиск"
          className="ax-input ax-input--grow"
          placeholder="Поиск по названию / id / zone…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="ax-viewer__actions">
          <button className="ax-btn" onClick={expandAll}>Развернуть все</button>
          <button className="ax-btn" onClick={collapseAll}>Свернуть все</button>
          {filter && (
            <button className="ax-btn ax-btn--ghost" onClick={() => setFilter('')}>
              Сброс
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <div className="ax-skeleton">Загрузка Roadmap…</div>
      ) : !html ? (
        <ErrorBlock
          title="Roadmap not bundled"
          file="app/static/roadmap/AXIOM_SYSTEM_V2__ROADMAP.html"
          details={err ?? 'Скопируйте HTML из public/data/roadmap/index.html'}
        />
      ) : (
        <div
          ref={containerRef}
          className="ax-doc ax-doc--roadmap ax-roadmap-filtering"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </section>
  );
}
