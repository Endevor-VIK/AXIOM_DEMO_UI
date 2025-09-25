import React from 'react'

const LocationsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false' {...p}>
    <path d='M12 21s6-6.2 6-11a6 6 0 1 0-12 0c0 4.8 6 11 6 11z' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinejoin='round' />
    <circle cx='12' cy='10' r='2.4' fill='none' stroke='currentColor' strokeWidth='1.5' />
  </svg>
)

export default LocationsIcon
