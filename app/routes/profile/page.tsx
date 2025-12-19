// AXIOM_DEMO_UI — PROFILE
// Route: /profile

import React from 'react'
import { Link } from 'react-router-dom'

import { safeText } from '@/components/utils'
import { useSession } from '@/lib/identity/useSession'

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (!parts.length) return 'AX'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  const first = (parts[0] ?? '').charAt(0)
  const last = (parts[parts.length - 1] ?? '').charAt(0) || first
  return `${first}${last}`.toUpperCase()
}

export default function ProfilePage() {
  const session = useSession()
  const user = session.user
  const displayName = safeText(user?.displayName ?? 'DEMO OPERATIVE')
  const handle = safeText(user?.handle ?? '@demo_user')
  const role = (user?.role ?? 'guest').toUpperCase()
  const lang = user?.lang ?? 'EN'

  return (
    <section className='ax-container ax-section'>
      <div className='ax-stack'>
        <header className='ax-card ax-user-card' data-noise='on'>
          <div className='ax-user-card__main'>
            <div className='ax-user-avatar' aria-hidden='true'>
              {initials(displayName)}
            </div>
            <div className='ax-user-meta'>
              <p className='ax-muted'>IDENTITY CENTER</p>
              <h1 className='ax-blade-head'>{displayName}</h1>
              <p className='ax-handle'>{handle}</p>
              <div className='ax-user-badges'>
                <span className='ax-chip' data-variant='level'>
                  ROLE :: {role}
                </span>
                <span className='ax-chip' data-variant='info'>
                  LANG :: {lang}
                </span>
                <span className='ax-chip' data-variant='accent'>
                  MODE :: DEMO
                </span>
              </div>
            </div>
          </div>
          <div className='ax-user-card__actions'>
            <Link className='ax-btn primary' to='/favorites'>
              OPEN FAVORITES
            </Link>
            <Link className='ax-btn ghost' to='/settings'>
              SETTINGS
            </Link>
          </div>
        </header>

        <div className='ax-user-grid'>
          <article className='ax-card ax-user-panel'>
            <header className='ax-user-panel__head'>
              <h2 className='ax-blade-head'>Account</h2>
              <span className='ax-chip' data-variant='info'>
                READ-ONLY
              </span>
            </header>
            <p className='ax-muted'>
              Demo account is stored locally. Backend-ready fields will appear here later.
            </p>
            <ul className='ax-user-list'>
              <li>
                <strong>User ID</strong>
                <span>{safeText(user?.id ?? 'demo-user')}</span>
              </li>
              <li>
                <strong>Handle</strong>
                <span>{handle}</span>
              </li>
              <li>
                <strong>Role</strong>
                <span>{role}</span>
              </li>
            </ul>
          </article>

          <article className='ax-card ax-user-panel'>
            <header className='ax-user-panel__head'>
              <h2 className='ax-blade-head'>Security</h2>
              <span className='ax-chip' data-variant='warn'>
                COMING SOON
              </span>
            </header>
            <p className='ax-muted'>
              Session is kept in the browser (localStorage). Future releases will surface device sessions,
              MFA, and access logs.
            </p>
            <div className='ax-user-panel__actions'>
              <Link className='ax-btn ghost' to='/help'>
                OPEN HELP
              </Link>
              <Link className='ax-btn ghost' to='/settings/personalization'>
                PERSONALIZATION
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
