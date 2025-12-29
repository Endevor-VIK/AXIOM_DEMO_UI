import React, { useEffect, useMemo, useRef } from 'react'
import ReactDOM from 'react-dom'

import { getFocusableElements } from '@/components/utils'

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({ open, onOpenChange, title, children }) => {
  const backdropRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)
  const titleId = useMemo(() => (title ? `ax-modal-title-${Math.random().toString(36).slice(2)}` : undefined), [title])

  useEffect(() => {
    if (!open) return

    document.body.classList.add('ax-scroll-lock')
    lastFocusedRef.current = (document.activeElement as HTMLElement) ?? null

    const panel = panelRef.current
    if (panel) {
      const focusables = getFocusableElements(panel)
      ;(focusables[0] ?? panel).focus()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onOpenChange(false)
        return
      }

      if (event.key !== 'Tab') return

      const panelNode = panelRef.current
      if (!panelNode) return

      const focusables = getFocusableElements(panelNode)
      if (!focusables.length) {
        event.preventDefault()
        panelNode.focus()
        return
      }

      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.body.classList.remove('ax-scroll-lock')
      document.removeEventListener('keydown', handleKeyDown, true)

      if (lastFocusedRef.current && document.contains(lastFocusedRef.current)) {
        lastFocusedRef.current.focus()
      }
    }
  }, [open, onOpenChange])

  if (!open) return null

  const container =
    document.getElementById('ax-modal-root') ??
    document.getElementById('modal-root') ??
    document.body

  const handleBackdropMouseDown: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (event.target === backdropRef.current) {
      onOpenChange(false)
    }
  }

  const dialogAccessibility = titleId
    ? { 'aria-labelledby': titleId }
    : { 'aria-label': 'Modal dialog' }

  const node = (
    <div className='ax-modal' aria-hidden={!open}>
      <div ref={backdropRef} className='ax-modal__backdrop' onMouseDown={handleBackdropMouseDown}>
        <div
          ref={panelRef}
          role='dialog'
          aria-modal='true'
          {...dialogAccessibility}
          className='ax-modal__panel'
          tabIndex={-1}
        >
          <div className='ax-modal__header'>
            {title ? (
              <h2 id={titleId} className='ax-modal__title'>
                {title}
              </h2>
            ) : null}
            <button
              type='button'
              className='ax-btn ax-btn--ghost ax-modal__close'
              onClick={() => onOpenChange(false)}
              aria-label='Close dialog'
            >
              ×
            </button>
          </div>
          <div className='ax-modal__body'>{children}</div>
        </div>
      </div>
    </div>
  )

  return ReactDOM.createPortal(node, container)
}

export default Modal
