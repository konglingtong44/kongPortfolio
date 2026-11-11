import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({ title, kicker, closeLabel, onClose, children }: {
  title: string; kicker: string; closeLabel: string; onClose: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = old; previous?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className="module-dialog" aria-labelledby="modal-title" onCancel={onClose}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
    <div className="dialog-header"><span className="eyebrow">{kicker}</span><button className="close-button" aria-label={closeLabel} onClick={onClose}>×</button></div>
    <h2 id="modal-title">{title}</h2>{children}
  </dialog>;
}
