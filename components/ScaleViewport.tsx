import React from 'react'

type ScaleViewportProps = {
  children: React.ReactNode
}

export default function ScaleViewport({ children }: ScaleViewportProps) {
  return (
    <div className='ax-viewport' data-scale-root>
      <div className='ax-canvas'>
        {children}
        <div id='ax-modal-root' />
      </div>
    </div>
  )
}
