import React from 'react'

const CharactersIcon: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false' {...p}>
    <circle cx='12' cy='9.5' r='3' fill='none' stroke='currentColor' strokeWidth='1.5' />
    <path d='M7 19c0-2.9 2.6-4.8 5-4.8s5 1.9 5 4.8' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
    <circle cx='6.5' cy='12' r='1.7' fill='currentColor' opacity='.25' />
  </svg>
)

export default CharactersIcon
