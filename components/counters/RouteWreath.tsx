import CounterWreath from './CounterWreath'

type RouteWreathProps = {
  label: string
  value: number | string
  title: string
  description?: string
  eyebrow?: string
  size?: number
  ariaLabel?: string
  className?: string
}

export default function RouteWreath({
  label,
  value,
  title,
  description,
  eyebrow = 'CONTROL STATUS',
  size = 240,
  ariaLabel,
  className,
}: RouteWreathProps) {
  const classes = ['ax-card', 'ghost', 'ax-route-wreath', className].filter(Boolean).join(' ')
  return (
    <section className={classes} aria-label={ariaLabel ?? `${label} module counter`}>
      <div className='ax-route-wreath__meta'>
        {eyebrow ? <span className='ax-route-wreath__eyebrow'>{eyebrow}</span> : null}
        <h2 className='ax-route-wreath__title ax-blade-head'>{title}</h2>
        {description ? <p className='ax-route-wreath__description'>{description}</p> : null}
      </div>
      <div className='ax-route-wreath__viz'>
        <CounterWreath value={value} label={label} size={size} ariaLabel={`${label} total ${value}`} />
      </div>
    </section>
  )
}

