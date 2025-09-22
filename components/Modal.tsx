import { useEffect } from 'react'
import type { ReactNode } from 'react'

export default function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      root.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className='ax-modal' role='dialog' aria-modal='true'>
      <div className='ax-modal__backdrop' onClick={onClose} />
      <div className='ax-modal__panel ax-card' role='document'>
        {children}
      </div>
    </div>
  )
}
