// AXIOM_DEMO_UI — WEB CORE
// Canvas: C08 — components/PanelNav.tsx
// Purpose: Responsive primary navigation with mobile collapse and current route highlighting.

import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';

interface PanelNavProps {
  onToggle?: (open: boolean) => void;
}

export default function PanelNav({ onToggle }: PanelNavProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => { onToggle?.(open); }, [open, onToggle]);

  return (
    <div className="ax-panelnav" ref={ref}>
      <button className="ax-btn" aria-expanded={open} aria-controls="ax-navmenu" onClick={() => setOpen(v => !v)}>
        ☰ Меню
      </button>
      <nav id="ax-navmenu" className={`ax-nav ${open ? 'open' : ''}`} aria-label="Primary">
        <NavLink to="/dashboard/roadmap" className={({isActive}) => isActive ? 'ax-tab active' : 'ax-tab'}>ROADMAP</NavLink>
        <NavLink to="/dashboard/audit" className={({isActive}) => isActive ? 'ax-tab active' : 'ax-tab'}>AUDIT</NavLink>
        <NavLink to="/dashboard/content" className={({isActive}) => isActive ? 'ax-tab active' : 'ax-tab'}>CONTENT</NavLink>
        <NavLink to="/dashboard/news" className={({isActive}) => isActive ? 'ax-tab active' : 'ax-tab'}>NEWS</NavLink>
      </nav>

      <style>{`
        .ax-panelnav{display:flex; align-items:center; gap:.5rem}
        #ax-navmenu{display:flex; gap:.5rem}
        @media (max-width: 720px){
          #ax-navmenu{ display:${open ? 'flex' : 'none'}; position:absolute; top:48px; left:8px; right:8px; padding:.5rem; background: color-mix(in srgb, var(--ax-ink) 85%, transparent); border:1px solid var(--ax-border); border-radius: .6rem; }
        }
      `}</style>
    </div>
  );
}
