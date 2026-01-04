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
  size,
  className,
  ariaLabel,
  ariaHidden,
}: CounterWreathProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<WreathApi | null>(null)
  const resolvedSize = typeof size === 'number' && Number.isFinite(size) && size > 0 ? size : undefined

  useEffect(() => {
    if (!containerRef.current) return
    const options = resolvedSize ? { value, label, ringSize: resolvedSize } : { value, label }
    apiRef.current = mountWreath(containerRef.current, options)
    return () => {
      apiRef.current?.destroy()
      apiRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, resolvedSize])

  useEffect(() => {
    apiRef.current?.setValue(value)
  }, [value])

  return (
    <div
      ref={containerRef}
      className={['ax-wreath', className].filter(Boolean).join(' ')}
      style={resolvedSize ? ({ '--ring-size': `${resolvedSize}px` } as CSSProperties) : undefined}
      role={ariaHidden ? undefined : 'img'}
      aria-hidden={ariaHidden || undefined}
      aria-label={ariaHidden ? undefined : ariaLabel ?? `${label} total ${value}`}
      data-label={label}
    />
  )
}
