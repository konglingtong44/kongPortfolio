import { useRef } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { activeChapter, useChapterWheel } from './useChapterWheel';

function Chapters({ enter, advance, back = () => {} }: { enter: () => void; advance: (direction: number) => void; back?: () => void }) {
  const intro = useRef<HTMLElement>(null), shelf = useRef<HTMLElement>(null), skills = useRef<HTMLElement>(null);
  useChapterWheel(intro, enter, true, 'intro');
  useChapterWheel(shelf, advance);
  useChapterWheel(skills, back, true, 'skills');
  return <><section id="introduction" ref={intro}/><section id="projects" ref={shelf}/><section id="skills" ref={skills}/></>;
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
let testTime = 0;
function setup() {
  vi.useFakeTimers(); vi.advanceTimersByTime(testTime += 5000);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  let chapter = 1, offset = 0;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const top = this.id === 'projects' ? (2 - chapter) * 900 + offset : this.id === 'skills' ? (3 - chapter) * 900 : (1 - chapter) * 900;
    return { top, bottom: top + 900, height: 900, left: 0, right: 1200, width: 1200, x: 0, y: top, toJSON: () => ({}) };
  });
  vi.stubGlobal('innerHeight', 900); vi.stubGlobal('scrollTo', vi.fn());
  return { chapter: (value: number, top = 0) => { chapter = value; offset = top; } };
}
it('enters 02 once and filters the momentum that follows the chapter transition', () => {
  const state = setup();
  const enter = vi.fn(), advance = vi.fn();
  render(<Chapters enter={enter} advance={advance}/>);
  fireEvent.wheel(document, { deltaY: 100 }); expect(enter).toHaveBeenCalledOnce();
  state.chapter(2);
  act(() => vi.advanceTimersByTime(200)); fireEvent.wheel(document, { deltaY: 80 });
  expect(advance).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(600)); fireEvent.wheel(document, { deltaY: 100 });
  expect(advance).toHaveBeenLastCalledWith(1);
});

it('lets a tall introduction scroll to its end before allowing any chapter jump', () => {
  setup();
  let bottom = 1380;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.id === 'introduction') return { top: bottom - 1380, bottom, height: 1380 } as DOMRect;
    if (this.id === 'projects') return { top: bottom, bottom: bottom + 900, height: 900 } as DOMRect;
    return { top: bottom + 900, bottom: bottom + 1800, height: 900 } as DOMRect;
  });
  const enter = vi.fn(), advance = vi.fn();
  render(<Chapters enter={enter} advance={advance}/>);
  expect(fireEvent.wheel(document, { deltaY: 120, cancelable: true })).toBe(true);
  bottom = 1020;
  expect(fireEvent.wheel(document, { deltaY: 120, cancelable: true })).toBe(true);
  expect(enter).not.toHaveBeenCalled(); expect(advance).not.toHaveBeenCalled();
  bottom = 900;
  fireEvent.wheel(document, { deltaY: 120, cancelable: true });
  expect(enter).toHaveBeenCalledOnce();
});
it('accepts upward shelf navigation and resumes after a manual 03-to-02 return with imperfect alignment', () => {
  const state = setup(); state.chapter(2, 23.5);
  const advance = vi.fn(), back = vi.fn();
  render(<Chapters enter={vi.fn()} advance={advance} back={back}/>);
  fireEvent.wheel(document, { deltaY: -100 }); expect(advance).toHaveBeenLastCalledWith(-1);
  state.chapter(3); act(() => vi.advanceTimersByTime(700));
  fireEvent.wheel(document, { deltaY: -100 }); expect(back).toHaveBeenCalledOnce();
  state.chapter(2, -18.5); act(() => vi.advanceTimersByTime(700));
  fireEvent.wheel(document, { deltaY: 100 }); expect(advance).toHaveBeenLastCalledWith(1);
  expect(activeChapter(1)).toBe('shelf');
});
it('does not trap scrolling through the lower toolkit, zooming, coarse pointers or an open dialog', () => {
  const state = setup(); state.chapter(4);
  const advance = vi.fn(); render(<Chapters enter={vi.fn()} advance={advance}/>);
  expect(fireEvent.wheel(document, { deltaY: -100, cancelable: true })).toBe(true);
  state.chapter(2);
  expect(fireEvent.wheel(document, { deltaY: 100, ctrlKey: true, cancelable: true })).toBe(true);
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  expect(fireEvent.wheel(document, { deltaY: 100, cancelable: true })).toBe(true);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const dialog = document.createElement('dialog'); dialog.setAttribute('open', ''); document.body.append(dialog);
  expect(fireEvent.wheel(document, { deltaY: 100, cancelable: true })).toBe(true);
  dialog.remove(); expect(advance).not.toHaveBeenCalled();
});
