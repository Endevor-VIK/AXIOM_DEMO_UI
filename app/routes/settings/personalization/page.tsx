// AXIOM_DEMO_UI — PERSONALIZATION
// Route: /settings/personalization

import React, { useState } from 'react'

const THEMES = ['system', 'light', 'dark']
const LANGS = ['EN', 'RU']
const DENSITIES = ['comfortable', 'compact']

export default function PersonalizationPage() {
  const [theme, setTheme] = useState<string>('system')
  const [lang, setLang] = useState<string>('EN')
  const [density, setDensity] = useState<string>('comfortable')

  return (
    <section className='ax-container ax-section'>
      <div className='ax-stack'>
        <header className='ax-card ghost ax-settings-head'>
          <div>
            <p className='ax-muted'>PERSONALIZATION · DEMO</p>
            <h1 className='ax-blade-head'>Interface presets</h1>
            <p className='ax-muted'>
              Local-only toggles to demonstrate layout. Values are not persisted until backend integration.
            </p>
          </div>
        </header>

        <div className='ax-settings-grid'>
          <article className='ax-card ax-settings-card'>
            <header>
              <h2 className='ax-blade-head'>Language</h2>
              <p className='ax-muted'>Pick preferred locale for UI labels.</p>
            </header>
            <label className='ax-visually-hidden' htmlFor='personalization-lang'>
              Preferred language
            </label>
            <select
              id='personalization-lang'
              className='ax-input'
              value={lang}
              onChange={(event) => setLang(event.target.value)}
            >
              {LANGS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className='ax-muted'>Current: {lang}. Stored locally during the session.</p>
          </article>

          <article className='ax-card ax-settings-card'>
            <header>
              <h2 className='ax-blade-head'>Theme</h2>
              <p className='ax-muted'>Choose how the panel should look. No global effect yet.</p>
            </header>
            <label className='ax-visually-hidden' htmlFor='personalization-theme'>
              Theme
            </label>
            <select
              id='personalization-theme'
              className='ax-input'
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
            >
              {THEMES.map((option) => (
                <option key={option} value={option}>
                  {option.toUpperCase()}
                </option>
              ))}
            </select>
            <p className='ax-muted'>Selected: {theme.toUpperCase()}.</p>
          </article>

          <article className='ax-card ax-settings-card'>
            <header>
              <h2 className='ax-blade-head'>Density</h2>
              <p className='ax-muted'>Prepare compact vs comfortable layouts.</p>
            </header>
            <label className='ax-visually-hidden' htmlFor='personalization-density'>
              Interface density
            </label>
            <select
              id='personalization-density'
              className='ax-input'
              value={density}
              onChange={(event) => setDensity(event.target.value)}
            >
              {DENSITIES.map((option) => (
                <option key={option} value={option}>
                  {option.toUpperCase()}
                </option>
              ))}
            </select>
            <p className='ax-muted'>Density preference: {density.toUpperCase()}.</p>
          </article>
        </div>
      </div>
    </section>
  )
}
