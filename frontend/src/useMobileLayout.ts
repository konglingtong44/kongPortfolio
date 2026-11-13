import { useSyncExternalStore } from 'react';

export const mobileLayoutQuery = '(max-width: 700px), (max-width: 950px) and (hover: none) and (pointer: coarse)';
export const isMobileLayout = () => window.matchMedia?.(mobileLayoutQuery).matches ?? false;
function subscribe(notify: () => void) {
  const media = window.matchMedia?.(mobileLayoutQuery);
  if (media?.addEventListener) {
    media.addEventListener('change', notify);
    return () => media.removeEventListener('change', notify);
  }
  media?.addListener?.(notify);
  return () => media?.removeListener?.(notify);
}
export function useMobileLayout() { return useSyncExternalStore(subscribe, isMobileLayout, () => false); }
