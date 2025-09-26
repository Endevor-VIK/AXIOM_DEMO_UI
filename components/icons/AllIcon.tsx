import React from 'react'

const AllIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false' {...props}>
    <rect x='3' y='3' width='7.5' height='7.5' rx='1.6' fill='none' stroke='currentColor' strokeWidth='1.5' />
    <rect x='13.5' y='3' width='7.5' height='7.5' rx='1.6' fill='none' stroke='currentColor' strokeWidth='1.5' />
    <rect x='3' y='13.5' width='7.5' height='7.5' rx='1.6' fill='none' stroke='currentColor' strokeWidth='1.5' />
    <rect x='13.5' y='13.5' width='7.5' height='7.5' rx='1.6' fill='none' stroke='currentColor' strokeWidth='1.5' />
  </svg>
)

export default AllIcon
