import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({ title, kicker, closeLabel, onClose, children, titleId = 'modal-title', className = '' }: {
  title: string; kicker: string; closeLabel: string; onClose: () => void; children: ReactNode; titleId?: string; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      // Release the native top layer before restoring focus to the parent dialog.
      if (dialog?.open) dialog.close();
      document.body.style.overflow = old;
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} className={`module-dialog ${className}`} aria-labelledby={titleId} onCancel={event => { event.stopPropagation(); onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
    <div className="dialog-header"><span className="eyebrow">{kicker}</span><button className="close-button" aria-label={closeLabel} onClick={onClose}>×</button></div>
    <h2 id={titleId}>{title}</h2>{children}
  </dialog>;
}
