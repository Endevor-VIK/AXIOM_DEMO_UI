// AXIOM_DEMO_UI - WEB CORE
// Canvas: C04 - app/routes/_layout.tsx
// Purpose: Shared dashboard layout with Red Protocol navigation and system status shell.

import React, { useCallback, useMemo, useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'

import HeadlinesTicker from '../../components/news/HeadlinesTicker'
import { useNewsManifest } from '../../lib/useNewsManifest'
import StatusLine from '@/components/StatusLine'

type NavItem = {
  to: string
  label: string
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'HOME', end: true },
  { to: '/dashboard/roadmap', label: 'ROADMAP' },
  { to: '/dashboard/audit', label: 'AUDIT' },
  { to: '/dashboard/content', label: 'CONTENT' },
  { to: '/dashboard/news', label: 'NEWS' },
]

export default function Layout() {
  const location = useLocation()
  const route = location.pathname || '/'

  const section = useMemo(() => {
    const parts = route.split('/').filter(Boolean)
    if (parts[0] !== 'dashboard') return route.toUpperCase()
    const key = parts[1] || 'home'
    return key === 'home' ? 'HOME' : key.replace(/-/g, ' ').toUpperCase()
  }, [route])

  const modeLabel = 'RED PROTOCOL'
  const [language, setLanguage] = useState<'RU' | 'EN'>('RU')
  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'RU' ? 'EN' : 'RU'))
  }, [])

  const statusMeta = useMemo(
    () => ({
      mode: modeLabel,
      section,
      version: 'v0.5.0',
    }),
    [modeLabel, section],
  )

  const tickerItems = useNewsManifest()

  return (
    <div className='ax-page'>
      <header className='ax-header ax-topbar'>
        <div className='ax-container'>
          <div className='ax-topbar__inner'>
            <div className='ax-brand' aria-label='AXIOM Panel'>
              AXIOM PANEL
            </div>
            <nav className='ax-tabs' aria-label='Primary navigation'>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={Boolean(item.end)}
                  className={({ isActive }) =>
                    isActive ? 'ax-tab ax-link-underline is-active' : 'ax-tab ax-link-underline'
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className='ax-topbar__actions'>
              <button
                type='button'
                className='ax-btn ghost ax-lang-toggle'
                onClick={toggleLanguage}
                aria-label='Toggle interface language'
              >
                {language}
              </button>
              <div className='ax-avatar' role='img' aria-label='User avatar'>
                AX
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* RED PROTOCOL Headlines Ticker */}
      <HeadlinesTicker {...(tickerItems ? { items: tickerItems } : {})} />

      {/* FX-layer: эффекты/scanlines; без интеракции */}
      <div id='fx-layer' aria-hidden />

      <main className='ax-shell ax-content'>
        <div className='ax-container'>
          <Outlet />
        </div>
      </main>

      <footer className='ax-footer ax-status'>
        <div className='ax-container'>
          <StatusLine meta={statusMeta} />
        </div>
      </footer>

      {/* Портал для модалок */}
      <div id='modal-root' />
    </div>
  )
}
