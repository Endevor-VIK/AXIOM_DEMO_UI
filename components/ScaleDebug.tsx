import React from 'react'

type ScaleDebugState = {
  mode: string
  layout: string
  density: string
  viewport: string
  composed: string
  virtualW: string
  virtualH: string
  width: number
  height: number
  dpr: number
}

const readScaleState = (): ScaleDebugState => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return {
      mode: 'n/a',
      layout: 'n/a',
      density: 'n/a',
      viewport: 'n/a',
      composed: 'n/a',
      virtualW: 'n/a',
      virtualH: 'n/a',
      width: 0,
      height: 0,
      dpr: 1,
    }
  }

  const root = document.documentElement
  const styles = getComputedStyle(root)
  const value = (name: string) => styles.getPropertyValue(name).trim() || 'n/a'

  return {
    mode: root.dataset.scaleMode || 'n/a',
    layout: root.dataset.layout || 'n/a',
    density: value('--ax-density-scale'),
    viewport: value('--ax-viewport-scale'),
    composed: value('--ax-composed-scale'),
    virtualW: value('--ax-virtual-w'),
    virtualH: value('--ax-virtual-h'),
    width: window.innerWidth || 0,
    height: window.innerHeight || 0,
    dpr: window.devicePixelRatio || 1,
  }
}

export default function ScaleDebug() {
  const [state, setState] = React.useState<ScaleDebugState>(readScaleState)

  React.useEffect(() => {
    let frame = 0
    const update = () => setState(readScaleState())
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    schedule()
    window.addEventListener('resize', schedule)
    window.addEventListener('orientationchange', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('orientationchange', schedule)
    }
  }, [])

  return (
    <div className='ax-scale-debug' aria-hidden>
      <div className='ax-scale-debug__title'>SCALE DEBUG</div>
      <div className='ax-scale-debug__row'>
        <span className='ax-scale-debug__label'>mode</span>
        <span className='ax-scale-debug__value'>{state.mode}</span>
      </div>
      <div className='ax-scale-debug__row'>
        <span className='ax-scale-debug__label'>layout</span>
        <span className='ax-scale-debug__value'>{state.layout}</span>
      </div>
      <div className='ax-scale-debug__row'>
        <span className='ax-scale-debug__label'>density</span>
        <span className='ax-scale-debug__value'>{state.density}</span>
      </div>
      <div className='ax-scale-debug__row'>
        <span className='ax-scale-debug__label'>viewport</span>
        <span className='ax-scale-debug__value'>{state.viewport}</span>
      </div>
      <div className='ax-scale-debug__row'>
        <span className='ax-scale-debug__label'>composed</span>
        <span className='ax-scale-debug__value'>{state.composed}</span>
      </div>
      <div className='ax-scale-debug__row'>
        <span className='ax-scale-debug__label'>virtual</span>
        <span className='ax-scale-debug__value'>
          {state.virtualW} × {state.virtualH}
        </span>
      </div>
      <div className='ax-scale-debug__row'>
        <span className='ax-scale-debug__label'>viewport</span>
        <span className='ax-scale-debug__value'>
          {state.width} × {state.height}
        </span>
      </div>
      <div className='ax-scale-debug__row'>
        <span className='ax-scale-debug__label'>dpr</span>
        <span className='ax-scale-debug__value'>{state.dpr}</span>
      </div>
    </div>
  )
}
