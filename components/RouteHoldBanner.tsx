import React from 'react'

type RouteHoldBannerProps = {
  title: string
  message: string
  note?: string
}

export default function RouteHoldBanner({ title, message, note }: RouteHoldBannerProps) {
  return (
    <section className='ax-card ax-hold-panel' role='status' aria-live='polite'>
      <div className='ax-hold-panel__eyebrow'>TEMP LOCK</div>
      <h2 className='ax-hold-panel__title'>{title}</h2>
      <p className='ax-hold-panel__message'>{message}</p>
      {note ? <p className='ax-hold-panel__note'>{note}</p> : null}
    </section>
  )
}
