import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MobileChapterNav } from './MobileChapterNav';
import { mobileLayoutQuery } from './useMobileLayout';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('renders only on a mobile layout and updates on a media query change', () => {
  let matches = false;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', (query: string) => ({ get matches() { return query === mobileLayoutQuery && matches; }, addEventListener: (_type: string, listener: () => void) => listeners.add(listener), removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener) }));
  const { unmount } = render(<MobileChapterNav locale="en" ready/>);
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  act(() => { matches = true; listeners.forEach(listener => listener()); });
  expect(screen.getByRole('navigation', { name: 'Chapter navigation' })).toBeInTheDocument();
  expect(screen.getAllByRole('link')).toHaveLength(4);
  act(() => { matches = false; listeners.forEach(listener => listener()); });
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  unmount(); expect(listeners.size).toBe(0);
});

it('navigates to chapters and prevents jumps to content until the profile is ready', () => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === mobileLayoutQuery, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const scroll = vi.fn(); vi.stubGlobal('scrollTo', scroll);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 500 } as DOMRect);
  const { rerender } = render(<><section id="projects"/><section id="lab"/><MobileChapterNav locale="en" ready={false}/></>);
  fireEvent.click(screen.getByRole('link', { name: /Projects/ }));
  expect(scroll).not.toHaveBeenCalled();
  rerender(<><section id="projects"/><section id="lab"/><MobileChapterNav locale="en" ready/></>);
  fireEvent.click(screen.getByRole('link', { name: /Projects/ }));
  expect(scroll).toHaveBeenLastCalledWith({ top: 500, behavior: 'smooth' });
  fireEvent.click(screen.getByRole('link', { name: /Tools/ }));
  expect(scroll).toHaveBeenCalledTimes(2);
});
