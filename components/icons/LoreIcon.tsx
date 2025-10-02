import React from 'react'

const LoreIcon: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false' {...p}>
    <path
      d='M6.5 5.5h7.8c1.2 0 2.2.6 2.7 1.7l2.5 5.3-2.5 5.3c-.5 1.1-1.5 1.7-2.7 1.7H6.5V5.5Z'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinejoin='round'
    />
    <path d='M10 9h5m-5 3h4m-4 3h3' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
  </svg>
)

export default LoreIcon
