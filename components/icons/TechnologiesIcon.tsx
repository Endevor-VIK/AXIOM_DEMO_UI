import React from 'react'

const TechnologiesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false' {...p}>
    <circle cx='12' cy='12' r='7' fill='none' stroke='currentColor' strokeWidth='1.5' />
    <path d='M12 5v2.5m0 9V19m7-7h-2.5m-9 0H5m10.6 4.6-1.8-1.8M9.2 9.2 7.4 7.4m9.2 0-1.8 1.8m-4.6 4.6-1.8 1.8' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
  </svg>
)

export default TechnologiesIcon
