import { useEffect, useMemo, useRef, useState } from 'react'

type BaseNews = {
  id?: string
  title: string
  date: string
  kind?: string
  tags?: string[]
  link?: string
}

export default function NewsTicker({
  items,
  speed = 42, // px/sec
  gap = 28,
  pulse = true,
}: {
  items: BaseNews[]
  speed?: number
  gap?: number
  pulse?: boolean
}) {
  const prepared = useMemo(() => {
    const arr = Array.isArray(items) ? items : []
    // гарантируем ключ и усечём до разумного числа для ленты
    return arr.slice(0, 14).map((n, i) => ({
      key: String(n.id || `${n.date}-${i}`),
      title: n.title,
      date: n.date,
      kind: (n.kind || 'update').toUpperCase(),
      tags: n.tags?.slice(0, 3) ?? [],
    }))
  }, [items])

  const trackRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    let raf = 0
    let x = 0
    let last = performance.now()
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const loop = (t: number) => {
      const dt = (t - last) / 1000
      last = t
      if (!paused && !reduce && trackRef.current) {
        x -= speed * dt
        const el = trackRef.current
        const w = el.scrollWidth
        if (Math.abs(x) >= w / 2) x = 0
        el.style.transform = `translate3d(${x}px,0,0)`
      }
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [speed, paused])

  const strip = (dup = false) => (
    <ul aria-hidden={dup} className='ax-ticker-strip'>
      {prepared.map((it) => (
        <li key={(dup ? 'd:' : '') + it.key} className='ax-ticker-item'>
          <span className='ax-chip ax-chip--muted'>{it.kind}</span>
          <span className='ax-ticker-date'>{it.date}</span>
          <span className='ax-ticker-title'>{it.title}</span>
          {it.tags.map((t, i) => (
            <span key={i} className='ax-chip ax-chip--hollow'>
              {String(t).toUpperCase()}
            </span>
          ))}
        </li>
      ))}
    </ul>
  )

  return (
    <div
      className={`ax-ticker${pulse ? ' ax-ticker--pulse' : ''}`}
      role='marquee'
      aria-label='Latest briefings'
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className='ax-ticker-viewport'>
        <div ref={trackRef} className='ax-ticker-track' style={{ gap }}>
          {strip(false)}
          {strip(true)}
        </div>
      </div>
    </div>
  )
}
