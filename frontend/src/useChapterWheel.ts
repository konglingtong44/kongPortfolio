import { useEffect, useRef, type RefObject } from 'react';

import { isMobileLayout } from './useMobileLayout';

type Chapter = 'intro' | 'shelf' | 'skills';
const gesture = { total: 0, lastEvent: -Infinity, lockedUntil: 0, consumed: false, direction: 0 };
export function scrollToChapter(id: 'home' | 'projects' | 'skills' | 'lab') {
  const element = document.getElementById(id);
  if (!element) return;
  const top = id === 'home' ? 0 : element.getBoundingClientRect().top + window.scrollY;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const distantMobileChapter = isMobileLayout() && Math.abs(top - window.scrollY) > window.innerHeight * 1.5;
  window.scrollTo({ top, behavior: reduced || distantMobileChapter ? 'instant' : 'smooth' });
}

// Select by viewport coverage, not a near-exact top coordinate or pointer location.
// This continues working after scrollbar dragging, anchor jumps and fractional zoom.
export function activeChapter(direction: number): Chapter | null {
  const height = window.innerHeight;
  const introduction = document.getElementById('introduction')?.getBoundingClientRect();
  // A long introduction must remain native-scrollable until its final content
  // is visible. This applies before shelf routing too, including short windows.
  if (introduction && introduction.top < height && introduction.bottom > height + 2) return null;
  const shelf = document.getElementById('projects')?.getBoundingClientRect();
  const skills = document.getElementById('skills')?.getBoundingClientRect();
  if (skills && direction < 0 && skills.top >= -64 && skills.top < height * .65) return 'skills';
  if (shelf && shelf.top < height * .55 && shelf.bottom > height * .45) return 'shelf';
  if (shelf && shelf.top >= height * .55 && window.scrollY < shelf.top + window.scrollY) return 'intro';
  return null;
}

export function useChapterWheel(ref: RefObject<HTMLElement | null>, onStep: (direction: number) => void, ready = true, mode: Chapter = 'shelf') {
  const action = useRef(onStep);
  action.current = onStep;
  useEffect(() => {
    if (!ref.current || !ready) return;
    function wheel(event: WheelEvent) {
      if (isMobileLayout()) return;
      if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta || mode === 'intro' && delta < 0 || mode === 'skills' && delta > 0) return;
      if (activeChapter(Math.sign(delta)) !== mode) return;
      const now = performance.now();
      const reversal = Math.sign(delta) !== gesture.direction && now >= gesture.lockedUntil - 200;
      const fresh = now - gesture.lastEvent > 150 || now < gesture.lastEvent || reversal;
      if (now < gesture.lastEvent || reversal) gesture.lockedUntil = 0;
      gesture.lastEvent = now;
      if (fresh && now >= gesture.lockedUntil) { gesture.consumed = false; gesture.total = 0; }
      event.preventDefault();
      if (gesture.consumed || now < gesture.lockedUntil) return;
      gesture.total += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      if (Math.abs(gesture.total) < 24) return;
      gesture.consumed = true; gesture.lockedUntil = now + 480; gesture.direction = Math.sign(gesture.total);
      // Re-align a manually returned shelf before moving its row, without requiring exact alignment.
      if (mode === 'shelf' && Math.abs(ref.current!.getBoundingClientRect().top) > 40) scrollToChapter('projects');
      action.current(gesture.direction);
    }
    document.addEventListener('wheel', wheel, { passive: false });
    return () => document.removeEventListener('wheel', wheel);
  }, [ref, ready, mode]);
}
