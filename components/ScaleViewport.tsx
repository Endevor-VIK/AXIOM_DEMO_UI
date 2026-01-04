import React from 'react'
import ScaleDebug from './ScaleDebug'

type ScaleViewportProps = {
  children: React.ReactNode
}

export default function ScaleViewport({ children }: ScaleViewportProps) {
  const debugEnabled =
    typeof document !== 'undefined' &&
    document.documentElement.dataset.scaleDebug === '1'

  return (
    <div className='ax-scale-viewport' data-scale-root>
      <div className='ax-scale-canvas'>
        {children}
        <div id='ax-modal-root' />
      </div>
      {debugEnabled ? <ScaleDebug /> : null}
    </div>
  )
}
