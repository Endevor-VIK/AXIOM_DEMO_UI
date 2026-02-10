// AXIOM_DEMO_UI — HELP
// Route: /help

import React from 'react'
import { Link } from 'react-router-dom'
import { resolveDeployTarget } from '@/lib/auth/deploy'

const HELP_LINKS = [
  { label: 'Profile & Auth SoT', to: '/docs/identity_profile_auth/PROFILE_AUTH_SOT_v2.3.1.md' },
  { label: 'Profile/Auth Spec', to: '/docs/identity_profile_auth/AXIOM_PROFILE_AUTH_v2.3.1_SPEC.md' },
  { label: 'Roadmap', to: '/dashboard/roadmap' },
  { label: 'Content Hub', to: '/dashboard/content' },
]

export default function HelpPage() {
  const deployTarget = resolveDeployTarget()
  const showAxchat = deployTarget === 'local'
  return (
    <section className='ax-container ax-section'>
      <div className='ax-stack'>
        <header className='ax-card ghost ax-help-head'>
          <div>
            <p className='ax-muted'>HELP · SUPPORT</p>
            <h1 className='ax-blade-head'>Assistance hub</h1>
            <p className='ax-muted'>
              Quick entry points to documentation and core modules. Content is static and backend-ready.
            </p>
          </div>
        </header>

        <div className='ax-help-grid'>
          <article className='ax-card ax-help-card'>
            <h2 className='ax-blade-head'>Documents</h2>
            <p className='ax-muted'>Source of Truth and SPEC references for this release.</p>
            <ul className='ax-help-list'>
              {HELP_LINKS.slice(0, 2).map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className='ax-link-underline'>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </article>

          <article className='ax-card ax-help-card'>
            <h2 className='ax-blade-head'>Modules</h2>
            <p className='ax-muted'>Navigate to key areas inside the panel.</p>
            <ul className='ax-help-list'>
              {HELP_LINKS.slice(2).map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className='ax-link-underline'>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </article>

          <article className='ax-card ax-help-card'>
            <h2 className='ax-blade-head'>Feedback</h2>
            <p className='ax-muted'>
              Report issues with dropdown positioning, favorites persistence, or routing. This page is ready
              for future feedback form wiring.
            </p>
            <div className='ax-help-actions'>
              {showAxchat ? (
                <Link to='/dashboard/axchat' className='ax-btn ghost'>
                  OPEN AXCHAT
                </Link>
              ) : null}
              <Link to='/dashboard/news' className='ax-btn ghost'>
                NEWS
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
