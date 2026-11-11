import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import App from './App';
import { localeKey } from './i18n';

const profile = {
  name: 'Kong', role: 'Software engineer', introduction: 'A profile from the API.',
  focus: [{ title: 'Web applications', description: 'Building things.' }],
  projects: [
    { kind: 'personal', title: 'My blog', period: '2026.11', role: 'Personal development', description: 'My own project.', outcome: 'Local site implemented.', tags: ['React'] },
    { kind: 'work', title: 'Telecom migration', period: '2019–2023', role: 'SE', description: 'Professional experience.', outcome: 'The team rolled out changes to 30+ services.', tags: ['Java'] },
  ],
  timeline: [{ period: '2018.06', title: 'Started as an engineer', description: 'System development.' }],
  skills: [{ title: 'APPLICATION', items: ['Java'] }],
  qualifications: [{ date: 'Earned 2021.08', name: 'AWS Solutions Architect – Professional' }],
  note: { date: '2026-11-11', title: 'Building my blog', summary: 'The first increment.', paragraphs: ['A real development note.'] },
};
const ok = (value = profile) => ({ ok: true, json: async () => value } as Response);

beforeEach(() => { localStorage.clear(); localStorage.setItem(localeKey, 'en'); });
afterEach(() => { vi.unstubAllGlobals(); });

it('renders API content, changes language and remembers the choice on reload', async () => {
  const fetchMock = vi.fn().mockResolvedValue(ok());
  vi.stubGlobal('fetch', fetchMock);
  const view = render(<App />);
  expect(await screen.findByText(profile.introduction)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'My blog' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '中文' }));
  await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('/api/profile?lang=zh', expect.anything()));
  expect(localStorage.getItem(localeKey)).toBe('zh');
  expect(document.documentElement.lang).toBe('zh-CN');
  view.unmount(); render(<App />);
  expect(screen.getByRole('button', { name: '中文' })).toHaveAttribute('aria-pressed', 'true');
  await screen.findByText(profile.introduction);
});

it('shows an error for an unavailable backend and recovers after retry', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(ok()));
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
  expect(screen.queryByText(profile.introduction)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
  expect(await screen.findByText(profile.introduction)).toBeInTheDocument();
});

it('rejects malformed API data', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ name: 'Kong' } as typeof profile)));
  render(<App />);
  expect(await screen.findByRole('alert')).toBeInTheDocument();
});

it('ignores a late response from the previously selected language', async () => {
  let finishOld: (value: Response) => void = () => {};
  vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { finishOld = resolve; })).mockResolvedValue(ok({ ...profile, introduction: '新的介绍' })));
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '中文' }));
  expect(await screen.findByText('新的介绍')).toBeInTheDocument();
  await act(async () => { finishOld(ok()); });
  expect(screen.getByText('新的介绍')).toBeInTheDocument();
  expect(screen.queryByText(profile.introduction)).not.toBeInTheDocument();
});

it('opens a dedicated project card with its contribution, and retains development notes', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()));
  render(<App />);
  await screen.findByText(profile.introduction);
  expect(screen.getByText('Personal project')).toBeInTheDocument();
  expect(screen.getByText('Professional case study')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Started as an engineer' })).toBeInTheDocument();
  const projectButton = screen.getByRole('button', { name: 'Open project: Telecom migration' });
  projectButton.focus(); fireEvent.click(projectButton);
  expect(screen.getByRole('dialog', { name: 'Telecom migration' })).toHaveAttribute('open');
  expect(screen.getByText('The team rolled out changes to 30+ services.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(projectButton).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: /03 \/ SYSTEM/ }));
  const noteSummary = screen.getByText(/Development notes/);
  fireEvent.click(noteSummary);
  expect(noteSummary.closest('details')).toHaveAttribute('open');
  expect(screen.getByText('A real development note.')).toBeVisible();
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
    expect(document.getElementById(anchor.hash.slice(1))).not.toBeNull();
  }
});

it('opens each module, restores focus and handles the side navigation', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()));
  render(<App />);
  await screen.findByText(profile.introduction);
  const nav = screen.getByRole('button', { name: 'Navigation' });
  fireEvent.mouseEnter(nav.closest('aside')!);
  expect(nav).toHaveAttribute('aria-expanded', 'true');
  fireEvent.keyDown(nav, { key: 'Escape' });
  expect(nav).toHaveAttribute('aria-expanded', 'false');
  for (const [module, heading] of [['REGEX', 'See the expression.'], ['ABOUT', 'A little more about me.'], ['SYSTEM', 'Behind this website.']]) {
    const button = screen.getByRole('button', { name: new RegExp(module) });
    button.focus(); fireEvent.click(button);
    expect(screen.getByRole('dialog', { name: heading })).toHaveAttribute('open');
    if (module === 'REGEX') expect(screen.getByLabelText(/Regular expression/)).toHaveValue('^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');
    if (module === 'ABOUT') expect(screen.getByText(/not connected yet/)).toBeInTheDocument();
    if (module === 'SYSTEM') expect(screen.getByText('AWS CodeConnections')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  }
});

it('orders projects by date even when the API order is mixed', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ ...profile, projects: [...profile.projects].reverse() })));
  render(<App />);
  await screen.findByText(profile.introduction);
  const headings = within(screen.getByRole('list', { name: 'Experience and projects' })).getAllByRole('article').map(article => article.querySelector('h3')?.textContent);
  expect(headings).toEqual(['My blog', 'Telecom migration', 'Started as an engineer']);
});

it('places the merged chapter before the bento toolkit and shows qualifications by default', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()));
  render(<App />);
  await screen.findByText(profile.introduction);
  const gallery = document.getElementById('projects')!;
  const skills = document.getElementById('skills')!;
  expect(gallery.compareDocumentPosition(skills) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(skills).getAllByRole('article')).toHaveLength(profile.skills.length + 1);
  expect(screen.getByText('Qualifications earned').closest('details')).toHaveAttribute('open');
  expect(screen.getByText('AWS Solutions Architect – Professional')).toBeVisible();
  expect(within(skills).getByText('Spring Boot')).toBeInTheDocument();
  expect(within(skills).getByText('Vitest')).toBeInTheDocument();
});
