import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { AUDIT_HTML, getHtml, isRenderableHtml, ensureTrailingSlash } from '@/app/lib/htmlMaps';
import RouteWreath from '@/components/counters/RouteWreath';
import { ErrorBlock } from '@/components/ErrorBlock';
import { vfs } from '@/lib/vfs';
import '@/app/styles/red-protocol-overrides.css';

type AuditItem = any; // манифест не типизирован — работаем гибко

function pickFileName(it: AuditItem): string {
  if (!it) return '';
  const raw =
    (typeof it === 'string' && it) ||
    it.file ||
    it.path ||
    it.href ||
    it.name ||
    '';
  const clean = String(raw).trim().replace(/^\/+/, '');
  const name = clean.split('/').pop() || clean;
  return name;
}

function labelFromName(name: string) {
  return name.replace(/\.html?$/i, '').replace(/[_-]/g, ' ');
}

export default function AuditRoute() {
  const dataBase = useMemo(
    () => ensureTrailingSlash(((import.meta as any)?.env?.VITE_DATA_BASE as string) ?? 'data/'),
    []
  );

  const [items, setItems] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>('2025-09-06__audit-demo.html');
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [scale, setScale] = useState<'1' | '1.1' | '1.25' | '1.5'>('1');
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  // Подменяем плейсхолдер %BASE_URL% внутри исходного HTML (для корректных относительных ссылок в iframe)
  const processedHtml = useMemo(
    () => (html ? html.replace(/%BASE_URL%/g, dataBase) : null),
    [html, dataBase]
  );

  const resizeFrame = useCallback(() => {
    const fr = frameRef.current;
    if (!fr) return;
    try {
      const doc = fr.contentDocument || fr.contentWindow?.document;
      if (!doc) return;
      // Добавляем небольшой запас
      const h = Math.max(
        doc.body.scrollHeight,
        doc.documentElement.scrollHeight
      );
      fr.style.height = h + 12 + 'px';
    } catch {
      // игнор
    }
  }, []);

  useEffect(() => {
    // попытка пересчёта высоты спустя тик (на случай отложенных шрифтов)
    if (processedHtml) {
      const id = setTimeout(resizeFrame, 120);
      return () => clearTimeout(id);
    }
  }, [processedHtml, resizeFrame]);

  // Загружаем список доступных аудитов
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await vfs.readAuditsManifest().catch(() => null);
        const names = Array.isArray(list) ? list.map(pickFileName).filter(Boolean) : [];
        if (!alive) return;
        setItems(names);
        const first = names[0];
        if (first && !names.includes(current)) {
          setCurrent(first); // first гарантированно string
        }
      } catch {
        // тихо — панель всё равно работает по дефолтному current
      }
    })();
    return () => {
      alive = false;
    };
  }, [current]);

  // Подгружаем HTML: сначала из бандла, затем фолбэк в public/data
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    const endsWith = '/' + current;
    const bundled = getHtml(AUDIT_HTML, endsWith);

    async function load() {
      // 1) если в бандле есть «содержимое»
      if (isRenderableHtml(bundled)) {
        if (!alive) return;
        setHtml(bundled!);
        setLoading(false);
        return;
      }
      // 2) фолбэк — fetch из public
      try {
        const res = await fetch(dataBase + 'audits/' + current, { cache: 'no-cache' });
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
        setErr(e?.message || 'Не удалось загрузить отчёт.');
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [current, dataBase]);

  const totalAudits = items.length > 0 ? items.length : current ? 1 : 0;
  const currentLabel = labelFromName(current);
  const wreathDescription = totalAudits > 0
    ? `Loaded ${totalAudits} audit dossier${totalAudits === 1 ? '' : 's'}. Active view: ${currentLabel}.`
    : 'No audit dossiers detected in the manifest.';

  const externalHref = dataBase + 'audits/' + current;

  return (
    <>
      <RouteWreath
        label="AUDIT"
        value={totalAudits}
        title="Audit Dossiers"
        description={wreathDescription}
        ariaLabel={`AUDIT module total ${totalAudits}`}
      />
      <section className="ax-card ax-viewer ax-viewer--audit">
        <div className="ax-viewer__toolbar">
        <label className="sr-only" htmlFor="audit-select">Выбрать отчёт</label>
        <select
          id="audit-select"
          className="ax-input"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        >
          {[current, ...items.filter((x) => x !== current)].map((name) => (
            <option key={name} value={name}>{labelFromName(name)}</option>
          ))}
        </select>

        <div className="ax-viewer__actions">
          <label className="ax-viewer__scale-label">
            <span className="sr-only">Масштаб</span>
            <select
              className="ax-input ax-input--sm"
              value={scale}
              onChange={(e) => setScale(e.target.value as any)}
            >
              <option value="1">100%</option>
              <option value="1.1">110%</option>
              <option value="1.25">125%</option>
              <option value="1.5">150%</option>
            </select>
          </label>
          <a className="ax-btn" href={externalHref} target="_blank" rel="noopener noreferrer">
            Open
          </a>
          <button className="ax-btn" onClick={() => setCurrent((v) => v)}>
            Reload
          </button>
        </div>
        </div>

        {loading ? (
        <div className="ax-skeleton">Загрузка отчёта…</div>
      ) : !processedHtml ? (
        <ErrorBlock
          title="Audit not available"
          file={`app/static/audits/${current}`}
          details={err ?? 'Скопируйте HTML из public/data/audits или проверьте манифест.'}
        />
      ) : (
        <div className="ax-doc-wrapper" data-scale={scale}>
          <iframe
            ref={frameRef}
            className="ax-audit-frame"
            title={current}
            srcDoc={processedHtml}
            onLoad={resizeFrame}
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
        )}
      </section>
    </>
  );
}
