import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Takes most of the screen height (lists). */
  tall?: boolean;
}

let openSheets = 0;

/** Bottom sheet: thumb-reachable on phones, centred dialog on wide screens. */
export function Sheet({ open, onClose, title, children, footer, tall }: Props) {
  // Callers pass inline closures; a ref keeps the effect from re-running on every render.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    window.addEventListener('keydown', onKey);
    openSheets++;
    document.documentElement.classList.add('no-scroll');
    return () => {
      window.removeEventListener('keydown', onKey);
      if (--openSheets === 0) document.documentElement.classList.remove('no-scroll');
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="sheet-root">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className={`sheet ${tall ? 'is-tall' : ''}`} role="dialog" aria-modal="true">
        <div className="sheet-handle" aria-hidden />
        {title && (
          <header className="sheet-head">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Fermer">
              <X size={20} />
            </button>
          </header>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
