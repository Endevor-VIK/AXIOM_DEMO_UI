// AXIOM_DEMO_UI — WEB CORE
// Canvas: C16 — app/routes/dashboard/roadmap/page.tsx
// Purpose: Roadmap panel. Prefer safe iframe render from /data; auto-detect common locations.

import React, { useEffect, useMemo, useState } from 'react';
import { vfs } from '@/lib/vfs';

function ensureSlash(s: string){ return s.endsWith('/') ? s : s + '/'; }

export default function RoadmapPage(){
  const dataBase = ensureSlash(((import.meta as any).env?.VITE_DATA_BASE as string) || 'data/');
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const candidates = useMemo(() => [
    'roadmap/index.html',
    'roadmap.html',
    'roadmap/roadmap.html',
  ], []);

  useEffect(() => {
    let alive = true;
    (async () => {
      for (const rel of candidates){
        try {
          const res = await vfs.fetchRaw(rel, { method: 'GET' });
          if (res.ok){ if (alive) { setSrc(dataBase + rel); setErr(null); } return; }
        } catch {}
      }
      if (alive) setErr('Файл Roadmap не найден в /data. Поместите его в data/roadmap/index.html или data/roadmap.html');
    })();
    return () => { alive = false; };
  }, [candidates, dataBase]);

  return (
    <div className="container">
      <h2>Roadmap</h2>
      {err && <div className="ax-err" role="alert">{err}</div>}
      {src ? (
        <>
          <p><small>Источник: <code className="ax-mono">{src.replace(location.origin, '')}</code></small></p>
          <iframe className="ax-frame" src={src} title="AXIOM Roadmap" />
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: '.5rem' }}>
            <a className="ax-btn" href={src} target="_blank" rel="noopener noreferrer">Открыть в новой вкладке</a>
          </div>
        </>
      ) : (
        !err && <p><small>Проверка доступных путей…</small></p>
      )}
    </div>
  );
}
