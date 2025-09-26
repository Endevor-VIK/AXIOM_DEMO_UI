import React from 'react'

const FactionsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false' {...p}>
    <path
      d='M12 5.5h7v13.5l-5.3-1.9a4.4 4.4 0 0 0-2.7 0l-5 1.8V5.5h6z'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinejoin='round'
    />
    <path
      d='M12 5.5v12.4M9 8.5h6M9 11.5h6'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
    />
  </svg>
)

export default FactionsIcon
