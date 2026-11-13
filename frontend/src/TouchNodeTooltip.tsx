import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function TouchNodeTooltip({ anchor, id, text, onClose }: { anchor: HTMLElement; id: string; text: string; onClose: () => void }) {
  const bubble = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const host = anchor.closest('dialog') ?? document.body;
  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    const bounds = host.tagName === 'DIALOG' ? host.getBoundingClientRect() : null;
    const dialog = bounds && bounds.width > 0 && bounds.height > 0 ? bounds : null;
    const leftEdge = Math.max((viewport?.offsetLeft ?? 0) + 12, dialog ? dialog.left + 8 : 0);
    const rightEdge = Math.min((viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth) - 12, dialog ? dialog.right - 8 : Infinity);
    const topEdge = Math.max((viewport?.offsetTop ?? 0) + 12, dialog ? dialog.top + 8 : 0);
    const bottomEdge = Math.min((viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - 12, dialog ? dialog.bottom - 8 : Infinity);
    const width = Math.max(100, Math.min(300, rightEdge - leftEdge));
    const rect = anchor.getBoundingClientRect();
    const maxHeight = Math.max(48, Math.min(300, Math.max(rect.top - topEdge - 12, bottomEdge - rect.bottom - 12)));
    if (!bubble.current) return;
    bubble.current.style.width = `${width}px`;
    bubble.current.style.maxHeight = `${maxHeight}px`;
    const height = bubble.current.getBoundingClientRect().height;
    const below = rect.bottom + 12;
    const top = below + height <= bottomEdge ? below : rect.top - height - 12;
    setPosition({ width, maxHeight, left: Math.max(leftEdge, Math.min(rect.left, rightEdge - width)), top: Math.max(topEdge, Math.min(top, bottomEdge - height)) });
  }, [anchor, text, host]);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !anchor.contains(event.target) && !bubble.current?.contains(event.target)) onClose();
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation(); onClose();
    }
    const map = anchor.closest('.architecture-map-scroll');
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    map?.addEventListener('scroll', onClose, { passive: true });
    host.addEventListener('scroll', onClose, { passive: true });
    window.addEventListener('scroll', onClose, { passive: true });
    window.addEventListener('resize', onClose);
    window.visualViewport?.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape, true);
      map?.removeEventListener('scroll', onClose);
      host.removeEventListener('scroll', onClose);
      window.removeEventListener('scroll', onClose);
      window.removeEventListener('resize', onClose);
      window.visualViewport?.removeEventListener('resize', onClose);
    };
  }, [anchor, host, onClose]);
  return createPortal(<div ref={bubble} id={id} role="tooltip" className="architecture-touch-tooltip" style={position ?? { visibility: 'hidden' }}>{text}</div>, host);
}
