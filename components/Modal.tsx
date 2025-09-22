import React, { useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { getFocusableElements } from '@/components/utils';

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
};

export const Modal: React.FC<ModalProps> = ({ open, onOpenChange, title, children }) => {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useMemo(() => (title ? 'ax-modal-title-' + Math.random().toString(36).slice(2) : ''), [title]);

  useEffect(() => {
    if (!open) return;
    // Scroll-lock
    document.body.classList.add('ax-scroll-lock');
    // Remember last focused
    lastFocusedRef.current = (document.activeElement as HTMLElement) ?? null;

    // Focus first focusable inside panel
    const panel = panelRef.current;
    if (panel) {
      const focusables = getFocusableElements(panel);
      (focusables[0] ?? panel).focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onOpenChange(false);
      } else if (e.key === 'Tab') {
        // Trap focus
        const panelNode = panelRef.current;
        if (!panelNode) return;
        const focusables = getFocusableElements(panelNode);
        if (focusables.length === 0) {
          e.preventDefault();
          panelNode.focus();
          return;
        }
        const first = focusables[0] ?? panelNode;
        const last = focusables[focusables.length - 1] ?? panelNode;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.body.classList.remove('ax-scroll-lock');
      document.removeEventListener('keydown', handleKeyDown, true);
      // Restore focus
      if (lastFocusedRef.current && document.contains(lastFocusedRef.current)) {
        lastFocusedRef.current.focus();
      }
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const container = document.getElementById('modal-root') ?? document.body;

  const onBackdropMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (e.target === backdropRef.current) {
      onOpenChange(false);
    }
  };

  const dialogA11y: { [k: string]: string } = title
    ? { 'aria-labelledby': titleId }
    : { 'aria-label': 'Модальное окно' };

  const node = (
    <div className="ax-modal" aria-hidden={!open}>
      <div
        ref={backdropRef}
        className="ax-modal__backdrop"
        onMouseDown={onBackdropMouseDown}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          {...dialogA11y}
          className="ax-modal__panel"
          tabIndex={-1}
        >
          <div className="ax-modal__header">
            {title ? (
              <h2 id={titleId} className="ax-modal__title">
                {title}
              </h2>
            ) : null}
            <button
              type="button"
              className="ax-btn ax-btn--ghost ax-modal__close"
              onClick={() => onOpenChange(false)}
              aria-label="Закрыть модальное окно"
            >
              ✕
            </button>
          </div>
          <div className="ax-modal__body">{children}</div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(node, container);
};

export default Modal;
