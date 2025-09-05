// AXIOM_DEMO_UI — WEB CORE
// Canvas: C10 — components/TerminalBoot.tsx
// Purpose: Terminal-like boot screen that preloads data and then redirects to /login.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { vfs } from '@/lib/vfs';

interface Line { t: string; msg: string; level?: 'ok'|'warn'|'err'|'log'; }

function ts(){
  const d = new Date();
  const p = (n:number) => String(n).padStart(2,'0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default function TerminalBoot(){
  const nav = useNavigate();
  const [lines, setLines] = useState<Line[]>([]);
  const push = (msg: string, level: Line['level'] = 'log') => setLines(ls => [...ls, { t: ts(), msg, level }]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        push('AXIOM :: INIT RED PROTOCOL …');
        push('Checking environment …');
        await sleep(120);

        push('Loading design tokens …');
        await sleep(80);

        push('Preloading snapshots: data/index.json, objects.json, logs.json …');
        try { await Promise.allSettled([ vfs.readIndex(), vfs.readObjects(), vfs.readLogs() ]); push('Snapshots OK', 'ok'); }
        catch(e){ push('Snapshots partial/failed', 'warn'); }

        push('Reading manifests: audits, content, news …');
        try { await Promise.allSettled([ vfs.readAuditsManifest(), vfs.readContentManifest(), vfs.readNewsManifest() ]); push('Manifests OK', 'ok'); }
        catch(e){ push('Manifests partial/failed', 'warn'); }

        push('Warm-up caches …');
        await sleep(80);

        push('All systems nominal. Redirecting to /login …', 'ok');
        await sleep(300);
        if (alive) nav('/login', { replace: true });
      } catch (err) {
        push('Boot failed. See console for details.', 'err');
        console.error('[AXIOM/TerminalBoot] error', err);
      }
    })();
    return () => { alive = false; };
  }, [nav]);

  return (
    <div className="boot" role="dialog" aria-label="AXIOM Terminal Boot">
      <div className="boot-header">
        <div className="boot-title">AXIOM • BOOT</div>
        <div className="ax-tag">RED</div>
      </div>
      <div className="boot-body">
        <div className="boot-log">
          {lines.map((l, i) => (
            <div key={i} className={`boot-line ${l.level ?? 'log'}`}>
              <span className="time">{l.t}</span>
              <span className="msg">{l.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function sleep(ms: number){ return new Promise(res => setTimeout(res, ms)); }
