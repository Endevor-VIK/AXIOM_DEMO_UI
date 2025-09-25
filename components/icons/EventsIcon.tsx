import React from 'react'

const EventsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false' {...p}>
    <rect x='4' y='6' width='16' height='13' rx='2' fill='none' stroke='currentColor' strokeWidth='1.5' />
    <path d='M4 10h16M8 4v4m8-4v4' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
    <rect x='8' y='13' width='3' height='3' rx='.7' fill='currentColor' opacity='.25' />
    <rect x='13' y='13' width='3' height='3' rx='.7' fill='currentColor' opacity='.25' />
  </svg>
)

export default EventsIcon
