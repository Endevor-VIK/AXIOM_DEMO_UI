// AXIOM_DEMO_UI — WEB CORE
// Canvas: C07 — components/StatusLine.tsx
// Purpose: Compact, accessible status footer with route, env, online state and optional GMS meta.

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

export type StatusMeta = {
  id?: string;      // AXIOM_META_ID
  zone?: string;    // e.g. [11_SYSTEM_INTERFACE]
  status?: string;  // DRAFT/ACTIVE/COMPLETE
  version?: string; // v1.0
};

export interface StatusLineProps {
  meta?: StatusMeta;
  showHotkeys?: boolean; // if true — show F11 hint
}

function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

function timeStr(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function StatusLine({ meta, showHotkeys = false }: StatusLineProps) {
  const loc = useLocation();
  const online = useOnlineStatus();

  const mode = import.meta.env.MODE;                 // 'development' | 'production'
  const envTag = (import.meta as any).env?.VITE_ENV || (mode === 'production' ? 'PUBLIC' : 'DEV');
  const buildTs = (import.meta as any).env?.VITE_BUILD_TIME as string | undefined; // optional

  const [now, setNow] = useState<string>(timeStr());
  useEffect(() => {
    const t = setInterval(() => setNow(timeStr()), 1000);
    return () => clearInterval(t);
  }, []);

  const route = useMemo(() => loc.pathname || '/', [loc.pathname]);
  const onlineCls = online ? 'ax-ok' : 'ax-err';

  return (
    <div className="row" role="status" aria-live="polite" aria-atomic="true">
      {/* LEFT: route + meta */}
      <div className="row" style={{ gap: '.5rem', flexWrap: 'wrap', alignItems: 'baseline' }}>
        <span className="ax-mono" aria-label="route">{route}</span>
        {meta?.id && (
          <span className="ax-tag" title="AXIOM_META_ID">{meta.id}</span>
        )}
        {meta?.zone && (
          <span className="ax-tag" title="Zone">{meta.zone}</span>
        )}
        {meta?.status && (
          <span className="ax-tag" title="Status">{meta.status}</span>
        )}
        {meta?.version && (
          <span className="ax-tag" title="Version">{meta.version}</span>
        )}
      </div>

      {/* RIGHT: env, hotkeys, time, online */}
      <div className="row" style={{ gap: '.75rem', marginLeft: 'auto', alignItems: 'center' }}>
        <span className="ax-tag" title="Environment">{envTag}</span>
        {buildTs && <span className="ax-tag" title="Build time">{buildTs}</span>}
        {showHotkeys && (
          <span className="ax-tag" title="Fullscreen hotkey">F11</span>
        )}
        <span className="ax-mono" aria-label="time">{now}</span>
        <span className={onlineCls} aria-label={online ? 'online' : 'offline'}>
          {online ? 'online' : 'offline'}
        </span>
      </div>
    </div>
  );
}
