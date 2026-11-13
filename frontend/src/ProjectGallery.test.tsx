import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { journeyEntries, newestProjects, ProjectGallery } from './ProjectGallery';
import type { Profile } from './profile';

const projects: Profile['projects'] = [
  { title: 'Older project', period: '2019.05 — 2023.05', kind: 'work', role: 'SE', description: 'Earlier work.', outcome: 'Earlier contribution.', tags: ['Java'] },
  { title: 'Current project', period: '2026.11 —', kind: 'personal', role: 'Developer', description: 'Current work.', outcome: 'Current contribution.', tags: ['React'] },
  { title: 'Middle project', period: '2025.01 — 2025.06', kind: 'work', role: 'SE', description: 'Recent work.', outcome: 'Recent contribution.', tags: ['C#'] },
];
const timeline: Profile['timeline'] = [
  { period: '2019.05 — 2023.05', title: 'Same career chapter', description: 'Career context.' },
  { period: '2018.06 — 2019.04', title: 'First role', description: 'Started working.' },
];
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
function media(reduced = false) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('max-width') ? false : query.includes('reduce') ? reduced : true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
}

it('sorts and merges matching career periods without losing their context', () => {
  expect(newestProjects(projects).map(p => p.title)).toEqual(['Current project', 'Middle project', 'Older project']);
  const entries = journeyEntries(projects, timeline);
  expect(entries).toHaveLength(4);
  expect(entries[2].event?.description).toBe('Career context.');
  expect(entries[3].title).toBe('First role');
  expect(projects[0].title).toBe('Older project');
});

it('labels this website without a date in the rail, card and detail while preserving order', () => {
  const website = { ...projects[1], title: 'kongPortfolio' };
  for (const [locale, label, open] of [
    ['ja', '本プロジェクト', 'プロジェクトを開く'],
    ['zh', '本项目', '打开项目'],
    ['en', 'This project', 'Open project'],
  ] as const) {
    const { container, unmount } = render(<ProjectGallery projects={[projects[0], website]} locale={locale}/>);
    expect(container.querySelector('.rail-period')).toHaveTextContent(label);
    expect(container.querySelector('.ticket-top')).toHaveTextContent(label);
    expect(container).not.toHaveTextContent('2026.11');
    fireEvent.click(screen.getByRole('button', { name: `${open}: kongPortfolio` }));
    expect(screen.getByRole('dialog')).toHaveTextContent(label);
    expect(screen.getByRole('dialog')).not.toHaveTextContent('2026.11');
    unmount();
  }
});

it('opens project and career details, supports keyboard and restores focus', () => {
  render(<ProjectGallery projects={projects} timeline={timeline} locale="en"/>);
  expect(within(screen.getByRole('list', { name: 'Experience and projects' })).getAllByRole('article')).toHaveLength(4);
  const button = screen.getByRole('button', { name: 'Open project: Older project' });
  button.focus(); fireEvent.click(button);
  expect(screen.getByRole('dialog', { name: 'Older project' })).toHaveTextContent('Earlier contribution.');
  expect(screen.getByRole('dialog')).toHaveTextContent('Career context.');
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(button).toHaveFocus();
  fireEvent.keyDown(button, { key: 'End' });
  expect(screen.getByRole('button', { name: 'Open project: First role' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Open project: First role' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('Started working.');
});

it('advances once per wheel gesture, ignores momentum and exits at the last card', () => {
  vi.useFakeTimers(); media();
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 900, left: 0, right: 1200, width: 1200, height: 900, x: 0, y: 0, toJSON: () => ({}) });
  const scroll = vi.fn(); vi.stubGlobal('scrollTo', scroll);
  const { container } = render(<><ProjectGallery projects={projects} locale="en"/><section id="skills"/></>);
  const root = container.querySelector('#projects')!;
  const next = screen.getByRole('button', { name: 'Next project' });
  const wheel = () => fireEvent.wheel(root, { deltaY: 100, cancelable: true });
  wheel(); wheel(); wheel();
  expect(next).toBeEnabled();
  expect(container.querySelector('.gallery-page')).toHaveTextContent('02 / 03');
  act(() => vi.advanceTimersByTime(600)); wheel();
  expect(next).toBeDisabled();
  expect(container.querySelector('.gallery-page')).toHaveTextContent('03 / 03');
  act(() => vi.advanceTimersByTime(600)); wheel();
  expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
});

it('uses instant navigation for reduced motion and does not capture touch/coarse wheel input', () => {
  media(true);
  const scroll = vi.fn(); HTMLElement.prototype.scrollTo = scroll;
  render(<ProjectGallery projects={projects} locale="en"/>);
  fireEvent.click(screen.getByRole('button', { name: 'Next project' }));
  expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'instant' }));
});

it('animates a timeline selection before opening details and moves the left rail with horizontal scroll', () => {
  vi.useFakeTimers(); media();
  const scroll = vi.fn(); HTMLElement.prototype.scrollTo = scroll;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('project-item') ? Array.from(this.parentElement!.children).indexOf(this) * 600 : 0;
  });
  const { container } = render(<ProjectGallery projects={projects} locale="en"/>);
  const navigation = screen.getByRole('navigation', { name: 'Career timeline' });
  fireEvent.click(within(navigation).getByRole('button', { name: /Middle project/ }));
  expect(scroll).toHaveBeenCalledWith({ left: 600, behavior: 'smooth' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const row = container.querySelector('.gallery-viewport') as HTMLElement;
  const rail = container.querySelector('.career-rail-track') as HTMLElement;
  const before = rail.style.transform;
  row.scrollLeft = 600;
  fireEvent.scroll(row);
  expect(rail.style.transform).not.toBe(before);
  fireEvent(row, new Event('scrollend'));
  expect(screen.getByRole('dialog', { name: 'Middle project' })).toHaveTextContent('Recent contribution.');
});

it('cancels a pending timeline open when the user interrupts the row', () => {
  vi.useFakeTimers(); media();
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('project-item') ? Array.from(this.parentElement!.children).indexOf(this) * 600 : 0;
  });
  const { container } = render(<ProjectGallery projects={projects} locale="en"/>);
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Career timeline' })).getByRole('button', { name: /Older project/ }));
  fireEvent.pointerDown(container.querySelector('.gallery-viewport')!);
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('selects projects from the mobile timeline without opening details or capturing vertical wheel input', () => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('max-width') || query.includes('reduce'), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('project-item') ? Array.from(this.parentElement!.children).indexOf(this) * 300 : 0;
  });
  HTMLElement.prototype.scrollTo = vi.fn(function (this: HTMLElement, options: ScrollToOptions | number = {}, _y?: number) { if (typeof options === 'object' && options.left !== undefined) this.scrollLeft = options.left; });
  const { container } = render(<ProjectGallery projects={projects} locale="en"/>);
  const navigation = screen.getByRole('navigation', { name: 'Career timeline' });
  fireEvent.click(within(navigation).getByRole('button', { name: /Middle project/ }));
  act(() => vi.advanceTimersByTime(1000));
  expect(container.querySelector('.gallery-page')).toHaveTextContent('02 / 03');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(fireEvent.wheel(container.querySelector('.gallery-viewport')!, { deltaY: 100, cancelable: true })).toBe(true);
  expect(container.querySelector('.gallery-page')).toHaveTextContent('02 / 03');
  expect(within(navigation).getAllByRole('button').every(button => button.tabIndex === 0)).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Open project: Middle project' }));
  expect(screen.getByRole('dialog', { name: 'Middle project' })).toBeInTheDocument();
});

it('keeps the selected mobile project centered when the viewport width changes', () => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('max-width') || query.includes('reduce'), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  let width = 300;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('project-item') ? Array.from(this.parentElement!.children).indexOf(this) * width : 0;
  });
  const scroll = vi.fn(function (this: HTMLElement, options: ScrollToOptions | number = {}, _y?: number) { if (typeof options === 'object' && options.left !== undefined) this.scrollLeft = options.left; });
  HTMLElement.prototype.scrollTo = scroll;
  const { container } = render(<ProjectGallery projects={projects} locale="en"/>);
  fireEvent.click(screen.getByRole('button', { name: 'Next project' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next project' }));
  act(() => vi.advanceTimersByTime(1000));
  width = 500;
  fireEvent.scroll(container.querySelector('.gallery-viewport')!);
  fireEvent.scroll(window);
  fireEvent(window, new Event('resize'));
  expect(scroll).toHaveBeenLastCalledWith({ left: 1000, behavior: 'instant' });
  expect(container.querySelector('.gallery-page')).toHaveTextContent('03 / 03');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('drags the desktop timeline independently and suppresses the click after dragging', () => {
  media();
  const { container } = render(<ProjectGallery projects={projects} locale="en"/>);
  const rail = screen.getByRole('navigation', { name: 'Career timeline' });
  const track = container.querySelector('.career-rail-track') as HTMLElement;
  const dispatch = (target: HTMLElement | Window, type: string, y: number) => {
    fireEvent(target, Object.assign(new Event(type, { bubbles: true, cancelable: true }), { pointerType: 'mouse', pointerId: 7, clientY: y, button: 0 }));
  };
  const before = track.style.transform;
  const entry = within(rail).getByRole('button', { name: /Middle project/ });
  dispatch(entry, 'pointerdown', 300);
  dispatch(window, 'pointermove', 140);
  expect(track.style.transform).not.toBe(before);
  expect(rail).toHaveClass('is-dragging');
  expect(container.querySelector('.gallery-page')).toHaveTextContent('01 / 03');
  dispatch(window, 'pointerup', 140);
  expect(rail).not.toHaveClass('is-dragging');
  fireEvent.click(entry);
  expect(container.querySelector('.gallery-page')).toHaveTextContent('01 / 03');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  dispatch(entry, 'pointerdown', 140);
  dispatch(window, 'pointerup', 140);
  fireEvent.click(entry);
  expect(container.querySelector('.gallery-page')).toHaveTextContent('02 / 03');
});
