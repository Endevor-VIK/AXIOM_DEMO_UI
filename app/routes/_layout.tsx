// AXIOM_DEMO_UI — WEB CORE
// Canvas: C04 — app/routes/_layout.tsx
// Purpose: Shared dashboard layout with PanelNav, StatusLine, Ticker and responsive shell.

import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import Ticker from '@/components/Ticker';
import StatusLine from '@/components/StatusLine';

export default function Layout() {
  const loc = useLocation();

  return (
    <div className="ax-shell">
      {/* Top bar */}
      <header className="ax-topbar" role="banner">
        <div className="ax-brand">AXIOM • UI</div>
        <nav className="ax-nav" aria-label="Primary">
          <NavLink to="/dashboard/roadmap" className={({isActive}) => isActive ? 'ax-tab active' : 'ax-tab'}>ROADMAP</NavLink>
          <NavLink to="/dashboard/audit" className={({isActive}) => isActive ? 'ax-tab active' : 'ax-tab'}>AUDIT</NavLink>
          <NavLink to="/dashboard/content" className={({isActive}) => isActive ? 'ax-tab active' : 'ax-tab'}>CONTENT</NavLink>
          <NavLink to="/dashboard/news" className={({isActive}) => isActive ? 'ax-tab active' : 'ax-tab'}>NEWS</NavLink>
        </nav>
        <div className="ax-actions">
          <button id="btn-logout" className="ax-btn" onClick={() => {
            try { localStorage.removeItem('axiom.auth'); } catch {}
            window.location.href = '/login';
          }}>Выход</button>
        </div>
      </header>

      {/* Ticker bar */}
      <section className="ax-ticker" aria-live="polite" aria-atomic="true">
        <Ticker maxItems={3} />
      </section>

      {/* Main content */}
      <main className="ax-main" role="main" aria-busy={false} data-route={loc.pathname}>
        <Outlet />
      </main>

      {/* Status line (GMS meta / system hints) */}
      <footer className="ax-status" role="contentinfo">
        <StatusLine />
      </footer>
    </div>
  );
}

/*
  Minimal CSS expectations (in styles/app.css):

  .ax-shell { display:flex; flex-direction:column; min-height:100dvh; }
  .ax-topbar { display:flex; align-items:center; justify-content:space-between; padding:0.5rem 1rem; border-bottom:1px solid var(--ax-border); background:var(--ax-bg); position:sticky; top:0; z-index:10; }
  .ax-brand { font-weight:700; letter-spacing:.08em; }
  .ax-nav { display:flex; gap:.5rem; overflow:auto; }
  .ax-tab { padding:.5rem .75rem; border-radius:.5rem; text-decoration:none; }
  .ax-tab.active { outline:1px solid var(--ax-red); background:color-mix(in srgb, var(--ax-red) 12%, transparent); }
  .ax-actions .ax-btn { padding:.45rem .8rem; border:1px solid var(--ax-border); border-radius:.5rem; background:transparent; }
  .ax-ticker { border-bottom:1px dashed var(--ax-border); padding:.25rem .75rem; font-size:.9rem; }
  .ax-main { flex:1 1 auto; padding:1rem; }
  .ax-status { border-top:1px solid var(--ax-border); padding:.35rem .75rem; font-size:.85rem; color:var(--ax-muted); }
*/
