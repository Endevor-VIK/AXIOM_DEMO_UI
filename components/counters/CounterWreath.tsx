import { useEffect, useRef, type CSSProperties } from 'react'
import { mountWreath, type WreathApi } from './wreath'
import '@/styles/counter-wreath.css'

type CounterWreathProps = {
  value: number | string
  label: string
  size?: number
  className?: string
  ariaLabel?: string | null
  ariaHidden?: boolean
}

export default function CounterWreath({
  value,
  label,
  size = 260,
  className,
  ariaLabel,
  ariaHidden,
}: CounterWreathProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<WreathApi | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    apiRef.current = mountWreath(containerRef.current, { value, label, ringSize: size })
    return () => {
      apiRef.current?.destroy()
      apiRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, size])

  useEffect(() => {
    apiRef.current?.setValue(value)
  }, [value])

  return (
    <div
      ref={containerRef}
      className={['ax-wreath', className].filter(Boolean).join(' ')}
      style={{ '--ring-size': `${size}px` } as CSSProperties}
      role={ariaHidden ? undefined : 'img'}
      aria-hidden={ariaHidden || undefined}
      aria-label={ariaHidden ? undefined : ariaLabel ?? `${label} total ${value}`}
      data-label={label}
    />
  )
}
