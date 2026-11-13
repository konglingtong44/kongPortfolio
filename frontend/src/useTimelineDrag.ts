import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { isMobileLayout } from './useMobileLayout';

export function useTimelineDrag(progress: number, current: number, count: number) {
  const [position, setPosition] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ pointer: number; y: number; start: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const limit = useRef(count - 1);
  limit.current = count - 1;
  useEffect(() => { setPosition(null); }, [current]);
  useEffect(() => {
    function move(event: globalThis.PointerEvent) {
      const active = drag.current;
      if (!active || active.pointer !== event.pointerId) return;
      const delta = active.y - event.clientY;
      if (!active.moved && Math.abs(delta) < 5) return;
      active.moved = true;
      event.preventDefault();
      setDragging(true);
      setPosition(Math.max(0, Math.min(limit.current, active.start + delta / 112)));
    }
    function finish(event?: globalThis.PointerEvent) {
      if (event && drag.current?.pointer !== event.pointerId) return;
      suppressClick.current = drag.current?.moved ?? false;
      drag.current = null;
      setDragging(false);
    }
    const blur = () => finish();
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('blur', blur);
    };
  }, []);
  return {
    position: position ?? progress,
    dragging,
    onPointerDown(event: PointerEvent) {
      suppressClick.current = false;
      if (isMobileLayout() || event.pointerType !== 'mouse' || event.button !== 0) return;
      drag.current = { pointer: event.pointerId, y: event.clientY, start: position ?? progress, moved: false };
    },
    onClickCapture(event: MouseEvent) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
