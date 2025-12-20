// AXIOM_DEMO_UI — SETTINGS
// Route: /settings

import React from 'react'
import { Link } from 'react-router-dom'

export default function SettingsPage() {
  return (
    <section className='ax-container ax-section'>
      <div className='ax-stack'>
        <header className='ax-card ghost ax-settings-head'>
          <div>
            <p className='ax-muted'>SETTINGS · DEMO</p>
            <h1 className='ax-blade-head'>Control panel</h1>
            <p className='ax-muted'>
              Structure for upcoming backend settings. Sections are placeholders, ready for API wiring.
            </p>
          </div>
          <div className='ax-settings-head__actions'>
            <Link className='ax-btn ghost' to='/settings/personalization'>
              PERSONALIZATION
            </Link>
            <Link className='ax-btn ghost' to='/help'>
              HELP
            </Link>
          </div>
        </header>

        <div className='ax-settings-grid'>
          <article className='ax-card ax-settings-card'>
            <header>
              <h2 className='ax-blade-head'>Interface</h2>
              <p className='ax-muted'>Theme, density, animations — ready for backend wiring.</p>
            </header>
            <ul className='ax-settings-list'>
              <li>Display language and typography presets.</li>
              <li>Theme hooks (dark/light/system) placeholders.</li>
              <li>Motion and focus ring preferences.</li>
            </ul>
            <Link className='ax-btn ghost' to='/settings/personalization'>
              OPEN PERSONALIZATION
            </Link>
          </article>

          <article className='ax-card ax-settings-card'>
            <header>
              <h2 className='ax-blade-head'>Account</h2>
              <p className='ax-muted'>Account data is demo-only until backend integration.</p>
            </header>
            <ul className='ax-settings-list'>
              <li>Email/username slots (read-only).</li>
              <li>Profile completeness indicators.</li>
              <li>Shortcuts to profile and favorites.</li>
            </ul>
            <Link className='ax-btn ghost' to='/profile'>
              VIEW PROFILE
            </Link>
          </article>

          <article className='ax-card ax-settings-card'>
            <header>
              <h2 className='ax-blade-head'>Security</h2>
              <p className='ax-muted'>Plan for device sessions, MFA, and access keys.</p>
            </header>
            <ul className='ax-settings-list'>
              <li>Session list with revoke controls (coming soon).</li>
              <li>MFA placeholder with backup codes slot.</li>
              <li>Audit log links for account events.</li>
            </ul>
            <Link className='ax-btn ghost' to='/help'>
              SECURITY HELP
            </Link>
          </article>
        </div>
      </div>
    </section>
  )
}
