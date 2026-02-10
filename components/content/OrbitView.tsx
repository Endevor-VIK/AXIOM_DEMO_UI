import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ContentItem } from '@/lib/vfs'
import { safeText } from '@/components/utils'
import { pickContentImage } from '@/lib/content/pickContentImage'

import { clampItemCount, rotationForIndex, snapIndex } from './orbitMath'
import './orbit-view.css'

export interface OrbitViewProps {
  items: ContentItem[]
  activeId: string | null
  onActiveChange?: (id: string) => void
  onSelect: (id: string) => void
  reducedMotion: boolean
  maxItems?: number
  onExit?: () => void
}

const DEFAULT_MAX = 24

function modIndex(value: number, count: number): number {
  if (count <= 0) return 0
  const mod = value % count
  return mod < 0 ? mod + count : mod
}

export default function OrbitView({
  items,
  activeId,
  onActiveChange,
  onSelect,
  reducedMotion,
  maxItems = DEFAULT_MAX,
  onExit,
}: OrbitViewProps) {
  const cappedCount = clampItemCount(items.length, maxItems)
  const capped = useMemo(() => items.slice(0, cappedCount), [items, cappedCount])
  const overflow = items.length - capped.length

  const rootRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  const [radius, setRadius] = useState(360)
  const stepDeg = useMemo(() => (capped.length > 0 ? 360 / capped.length : 0), [capped.length])

  const [activeIndex, setActiveIndex] = useState(0)
  const activeIndexRef = useRef(0)

  const rotationRef = useRef(0)
  const animRef = useRef<number | null>(null)
  const draggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartRotationRef = useRef(0)
  const wheelSnapTimeoutRef = useRef<number | null>(null)

  const applyRotation = useCallback((rotation: number) => {
    if (!trackRef.current) return
    trackRef.current.style.transform = `rotateY(${rotation}deg)`
  }, [])

  const updateActiveIndex = useCallback(
    (next: number) => {
      if (activeIndexRef.current === next) return
      activeIndexRef.current = next
      setActiveIndex(next)
      const id = capped[next]?.id
      if (id) onActiveChange?.(id)
    },
    [capped, onActiveChange],
  )

  const snapTo = useCallback(
    (index: number) => {
      if (!capped.length) return
      const next = modIndex(index, capped.length)
      updateActiveIndex(next)
      const target = rotationForIndex(next, stepDeg)

      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
      }

      const animate = () => {
        const current = rotationRef.current
        const delta = target - current
        const nextRotation = Math.abs(delta) < 0.02 ? target : current + delta * 0.14
        rotationRef.current = nextRotation
        applyRotation(nextRotation)
        if (nextRotation !== target) {
          animRef.current = requestAnimationFrame(animate)
        } else {
          animRef.current = null
          const id = capped[next]?.id
          if (id) onSelect(id)
        }
      }

      animRef.current = requestAnimationFrame(animate)
    },
    [applyRotation, capped, onSelect, stepDeg, updateActiveIndex],
  )

  useEffect(() => {
    optionRefs.current = capped.map((_, idx) => optionRefs.current[idx] ?? null)
  }, [capped.length])

  useEffect(() => {
    if (!rootRef.current) return
    const node = rootRef.current

    const measure = () => {
      const width = node.clientWidth || 0
      const next = Math.max(220, Math.min(420, Math.floor(width * 0.42)))
      setRadius(next)
    }

    measure()
    const observer = new ResizeObserver(() => measure())
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!capped.length) return
    const idx = capped.findIndex((it) => it.id === activeId)
    const next = idx >= 0 ? idx : 0
    updateActiveIndex(next)
    rotationRef.current = rotationForIndex(next, stepDeg)
    applyRotation(rotationRef.current)
  }, [activeId, applyRotation, capped, stepDeg, updateActiveIndex])

  useEffect(() => {
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current)
      if (wheelSnapTimeoutRef.current !== null) window.clearTimeout(wheelSnapTimeoutRef.current)
    }
  }, [])

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if (reducedMotion) return
    if (event.button !== 0) return
    draggingRef.current = true
    dragStartXRef.current = event.clientX
    dragStartRotationRef.current = rotationRef.current
    ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  }, [reducedMotion])

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (reducedMotion) return
      if (!draggingRef.current) return
      if (!capped.length || stepDeg === 0) return
      const deltaX = event.clientX - dragStartXRef.current
      const sensitivity = 0.25 // deg per px
      const nextRotation = dragStartRotationRef.current + deltaX * sensitivity
      rotationRef.current = nextRotation
      applyRotation(nextRotation)
      const idx = snapIndex(nextRotation, stepDeg, capped.length)
      updateActiveIndex(idx)
    },
    [applyRotation, capped.length, reducedMotion, stepDeg, updateActiveIndex],
  )

  const handlePointerUp = useCallback(() => {
    if (reducedMotion) return
    if (!draggingRef.current) return
    draggingRef.current = false
    if (!capped.length || stepDeg === 0) return
    const idx = snapIndex(rotationRef.current, stepDeg, capped.length)
    snapTo(idx)
  }, [capped.length, reducedMotion, snapTo, stepDeg])

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (reducedMotion) return
      if (!capped.length || stepDeg === 0) return
      event.preventDefault()
      const primary =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      const wheelSensitivity = 0.18
      rotationRef.current = rotationRef.current + primary * wheelSensitivity
      applyRotation(rotationRef.current)
      updateActiveIndex(snapIndex(rotationRef.current, stepDeg, capped.length))

      if (wheelSnapTimeoutRef.current !== null) {
        window.clearTimeout(wheelSnapTimeoutRef.current)
      }
      wheelSnapTimeoutRef.current = window.setTimeout(() => {
        const idx = snapIndex(rotationRef.current, stepDeg, capped.length)
        snapTo(idx)
      }, 120)
    },
    [applyRotation, capped.length, reducedMotion, snapTo, stepDeg, updateActiveIndex],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!capped.length) return
      switch (event.key) {
        case 'ArrowLeft': {
          event.preventDefault()
          const next = modIndex(activeIndexRef.current - 1, capped.length)
          snapTo(next)
          optionRefs.current[next]?.focus()
          return
        }
        case 'ArrowRight': {
          event.preventDefault()
          const next = modIndex(activeIndexRef.current + 1, capped.length)
          snapTo(next)
          optionRefs.current[next]?.focus()
          return
        }
        case 'Enter': {
          event.preventDefault()
          const id = capped[activeIndexRef.current]?.id
          if (id) onSelect(id)
          return
        }
        case 'Escape': {
          if (onExit) {
            event.preventDefault()
            onExit()
          }
          return
        }
        default:
          return
      }
    },
    [capped, onExit, onSelect, snapTo],
  )

  if (!capped.length) {
    return <div className='ax-orbit ax-orbit--empty'>No items.</div>
  }

  if (reducedMotion) {
    return (
      <div className='ax-orbit-fallback' aria-label='Orbit view (reduced motion)'>
        <div className='ax-orbit-fallback__note'>Orbit disabled by Reduced Motion.</div>
        <div className='ax-orbit-fallback__strip' role='listbox' aria-label='Items'>
          {capped.map((item) => {
            const isActive = item.id === activeId
            return (
              <button
                key={item.id}
                type='button'
                role='option'
                aria-selected={isActive}
                className='ax-orbit-fallback__card'
                data-active={isActive ? 'true' : undefined}
                onClick={() => onSelect(item.id)}
              >
                <img src={pickContentImage(item)} alt={safeText(item.title)} loading='lazy' />
                <span className='ax-orbit-fallback__title'>{safeText(item.title)}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className='ax-orbit-shell' aria-label='Orbit view'>
      <div
        ref={rootRef}
        className='ax-orbit'
        role='listbox'
        tabIndex={0}
        aria-label='Orbit view'
        style={{ ['--ax-orbit-radius' as any]: `${radius}px` }}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <div ref={trackRef} className='ax-orbit__track'>
          {capped.map((item, idx) => {
            const isActive = idx === activeIndex
            const theta = idx * stepDeg
            const transform = `translate(-50%, -50%) rotateY(${theta}deg) translateZ(${radius}px)`
            return (
              <div
                key={item.id}
                className='ax-orbit__card'
                style={{ transform }}
                data-active={isActive ? 'true' : undefined}
              >
                <button
                  ref={(node) => {
                    optionRefs.current[idx] = node
                  }}
                  type='button'
                  role='option'
                  aria-selected={isActive}
                  className='ax-orbit__btn'
                  data-testid={`orbit-option-${item.id}`}
                  data-active={isActive ? 'true' : undefined}
                  onClick={() => onSelect(item.id)}
                >
                  <img
                    src={pickContentImage(item)}
                    alt={safeText(item.title)}
                    className='ax-orbit__img'
                    loading='lazy'
                  />
                  <span className='ax-orbit__label'>
                    <span className='ax-orbit__title'>{safeText(item.title)}</span>
                    <span className='ax-orbit__meta'>
                      {safeText(item.category).toUpperCase()} · {safeText(item.status).toUpperCase()}
                    </span>
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {overflow > 0 ? (
        <p className='ax-orbit-note' aria-live='polite'>
          Showing {capped.length} of {items.length}. Use search/filters to narrow results.
        </p>
      ) : null}
    </div>
  )
}
