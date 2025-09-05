// AXIOM_DEMO_UI — WEB CORE
// Canvas: C18 — app/routes/dashboard/content/page.tsx
// Purpose: Content panel — lists content manifest items with filters (tags), preview for HTML, link-out for others.

import React, { useEffect, useMemo, useState } from 'react';
import { vfs, type ManifestItem } from '@/lib/vfs';

function ensureSlash(s: string){ return s.endsWith('/') ? s : s + '/'; }
function isHtml(file?: string){ return !!file && /(\.html?|\.xhtml)$/i.test(file); }
function isText(file?: string){ return !!file && /(\.md|\.txt)$/i.test(file); }

export default function ContentPage(){
  const dataBase = ensureSlash(((import.meta as any).env?.VITE_DATA_BASE as string) || 'data/');

  const [items, setItems] = useState<ManifestItem[]>([]);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string>('');
  const [selected, setSelected] = useState<ManifestItem | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setBusy(true);
        const list = await vfs.readContentManifest();
        const withIdx = (Array.isArray(list) ? list : []).map((it, i) => ({ _idx: i, ...it }));
        withIdx.sort((a:any,b:any) => (a?.date < b?.date ? 1 : a?.date > b?.date ? -1 : 0));
        if (alive){ setItems(withIdx); setSelected(withIdx[0] ?? null); setErr(null); }
      } catch (e:any){ if (alive) setErr(e?.message || 'Не удалось загрузить манифест контента'); }
      finally { if (alive) setBusy(false); }
    })();
    return () => { alive = false; };
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const it of items){
      const tags = (it as any).tags as string[] | undefined;
      if (Array.isArray(tags)) tags.forEach(t => s.add(t));
    }
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter(it => {
      const okQ = !term || (it.title||'').toLowerCase().includes(term) || (it.date||'').toLowerCase().includes(term);
      const okTag = !tag || ((it as any).tags || []).includes(tag);
      return okQ && okTag;
    });
  }, [q, tag, items]);

  const src = useMemo(() => {
    if (!selected?.file) return null;
    const rel = String(selected.file).replace(/^\/+/, '');
    return isHtml(rel) ? dataBase + rel : null;
  }, [selected, dataBase]);

  return (
    <div className="container" aria-busy={busy}>
      <h2>Content</h2>
      {err && <div className="ax-err" role="alert">{err}</div>}

      <div className="row" style={{ gap: '.75rem', margin: '.5rem 0 1rem', flexWrap: 'wrap' }}>
        <input
          className="ax-input"
          placeholder="Поиск по названию/дате…"
          value={q}
          onChange={e=>setQ(e.target.value)}
          aria-label="Поиск"
          style={{ minWidth: 260 }}
        />
        <select className="ax-input" value={tag} onChange={e=>setTag(e.target.value)} aria-label="Фильтр по тегу">
          <option value="">Все теги</option>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="ax-tag">Всего: {items.length}</span>
        <span className="ax-tag">Отфильтровано: {filtered.length}</span>
      </div>

      <div className="grid">
        {/* List */}
        <section className="card ax-card" style={{ gridColumn: 'span 4' }} aria-label="Список контента">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '.5rem' }}>
            {filtered.map((it, i) => {
              const active = selected?._idx === (it as any)._idx;
              return (
                <li key={(it as any)._idx}>
                  <button
                    className={`ax-btn ${active ? 'primary' : ''}`}
                    onClick={() => setSelected(it)}
                    style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }}
                    aria-current={active ? 'true' : undefined}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title || 'Без названия'}</span>
                    <small style={{ marginLeft: '.75rem' }}>{it.date || ''}</small>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Preview / Details */}
        <section className="card ax-card" style={{ gridColumn: 'span 8' }} aria-label="Предпросмотр">
          {!selected && <small>Выберите запись слева.</small>}
          {selected && (
            <div className="col">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ margin: 0 }}>{selected.title || 'Без названия'}</h3>
                <small>{selected.date || ''}</small>
              </div>
              {selected.file ? (
                isHtml(selected.file) ? (
                  <>
                    <p><small>Источник: <code className="ax-mono">{(dataBase + String(selected.file)).replace(location.origin, '')}</code></small></p>
                    <iframe className="ax-frame" src={src!} title={`CONTENT: ${selected.title || selected.file}`} />
                    <div className="row" style={{ justifyContent: 'flex-end', marginTop: '.5rem' }}>
                      <a className="ax-btn" href={src!} target="_blank" rel="noopener noreferrer">Открыть в новой вкладке</a>
                    </div>
                  </>
                ) : isText(selected.file) ? (
                  <>
                    <p><small>Файл <code className="ax-mono">{selected.file}</code></small></p>
                    <p><small>Рендер Markdown/TXT появится позже. Откройте файл напрямую.</small></p>
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <a className="ax-btn" href={dataBase + String(selected.file)} target="_blank" rel="noopener noreferrer">Открыть файл</a>
                    </div>
                  </>
                ) : (
                  <>
                    <p><small>Неподдерживаемый формат предпросмотра. Скачайте или откройте файл напрямую.</small></p>
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <a className="ax-btn" href={dataBase + String(selected.file)} target="_blank" rel="noopener noreferrer">Открыть файл</a>
                    </div>
                  </>
                )
              ) : (
                <small>Для этой записи файл не указан.</small>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
