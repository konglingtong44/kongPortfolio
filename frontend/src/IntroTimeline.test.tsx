import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { IntroTimeline } from './IntroTimeline';
import { ProjectGallery } from './ProjectGallery';
import { mobileLayoutQuery } from './useMobileLayout';

afterEach(() => vi.unstubAllGlobals());

it('shows the supplied education and employment periods with anonymous company labels', () => {
  render(<IntroTimeline locale="zh"/>);
  const timeline = screen.getByRole('complementary', { name: '学习与任职' });
  expect(within(timeline).getAllByRole('listitem')).toHaveLength(4);
  expect(timeline).toHaveTextContent('辽宁师范大学');
  expect(timeline).toHaveTextContent('信息科学学院 · 计算机科学专业');
  expect(timeline).toHaveTextContent('A 社 · 中国侧');
  expect(timeline).toHaveTextContent('A 社 · 日本侧');
  expect(timeline).toHaveTextContent('B 社');
  expect(timeline).toHaveTextContent('PG / SE');
  expect(timeline).toHaveTextContent('SE → 副组长');
  expect(timeline).toHaveTextContent('SE / 副组长 / PMO');
  expect(timeline.querySelectorAll('time')[0]).toHaveAttribute('dateTime', '2014-09');
  expect(timeline.querySelectorAll('time')[6]).toHaveAttribute('dateTime', '2023-06');
  expect(within(timeline).getAllByRole('heading', { level: 3 }).map(heading => heading.textContent))
    .toEqual(['辽宁师范大学', 'A 社 · 中国侧', 'A 社 · 日本侧', 'B 社']);
});

it.each(['ja', 'en'] as const)('keeps the four milestones localized in %s', locale => {
  render(<IntroTimeline locale={locale}/>);
  const timeline = screen.getByRole('complementary');
  expect(within(timeline).getAllByRole('listitem')).toHaveLength(4);
  expect(within(timeline).getAllByRole('heading', { level: 3 }).map(heading => heading.textContent))
    .toEqual(locale === 'ja'
      ? ['遼寧師範大学', 'A 社 · 中国側', 'A 社 · 日本側', 'B 社']
      : ['Liaoning Normal University', 'Company A · China', 'Company A · Japan', 'Company B']);
  expect(timeline).toHaveTextContent(locale === 'ja' ? 'A 社 · 日本側' : 'Company A · Japan');
});

it('returns from 02 to 01 through its explicit button', () => {
  const scroll = vi.fn(); vi.stubGlobal('scrollTo', scroll);
  render(<ProjectGallery projects={[]} locale="en"/>);
  fireEvent.click(screen.getByRole('link', { name: '01 / Back to intro' }));
  // The page header owns the #home anchor in the real app.
  const home = document.createElement('header'); home.id = 'home'; document.body.append(home);
  fireEvent.click(screen.getByRole('link', { name: '01 / Back to intro' }));
  expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  home.remove(); vi.unstubAllGlobals();
});

it('collapses the mobile career summary without removing any of the four milestones', () => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === mobileLayoutQuery, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const { container } = render(<IntroTimeline locale="zh"/>);
  const details = container.querySelector('details')!;
  expect(details).not.toHaveAttribute('open');
  expect(container.querySelectorAll('.intro-milestones li')).toHaveLength(4);
  expect(container.querySelector('.intro-timeline-art')).not.toBeInTheDocument();
  fireEvent.click(details.querySelector('summary')!);
  expect(details).toHaveAttribute('open');
  expect(screen.getByRole('heading', { name: '辽宁师范大学' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'B 社' })).toBeInTheDocument();
});
