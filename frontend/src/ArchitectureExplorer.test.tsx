import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ArchitectureExplorer } from './ArchitectureExplorer';
import { ProjectGallery } from './ProjectGallery';
import { mobileLayoutQuery } from './useMobileLayout';

afterEach(() => vi.unstubAllGlobals());

it('explains planned services on focus and tap in every language', () => {
  for (const locale of ['ja', 'zh', 'en'] as const) {
    const { unmount } = render(<ArchitectureExplorer locale={locale}/>);
    const bedrock = screen.getByRole('button', { name: /Amazon Bedrock/ });
    fireEvent.focus(bedrock);
    const story = document.getElementById('architecture-node-story')!;
    expect(story).toHaveTextContent('PREPARING');
    expect(bedrock).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /ALB → ECS/ }));
    expect(story).toHaveTextContent('ECR');
    expect(bedrock).toHaveAttribute('aria-pressed', 'false');
    unmount();
  }
});

it('separates architecture, CI/CD and failure recovery, and places Vite at build time', () => {
  render(<ArchitectureExplorer locale="en"/>);
  expect(screen.getByRole('button', { name: '01 / Architecture' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /^Browser/ })).not.toHaveTextContent('Vite');
  fireEvent.click(screen.getByRole('button', { name: /Private S3/ }));
  expect(document.getElementById('architecture-node-story')).toHaveTextContent('no Vite server runs in production');
  fireEvent.click(screen.getByRole('button', { name: '03 / Failure recovery' }));
  expect(screen.getByRole('heading', { name: 'When a release goes wrong' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '02 / CI/CD' })).toBeInTheDocument();
});

it('simulates promotion and stop-triggered rollback without network calls', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  const { unmount } = render(<ArchitectureExplorer locale="en"/>);
  fireEvent.click(screen.getByRole('button', { name: /02 \/ CI\/CD/ }));
  expect(screen.getByRole('button', { name: /ApproveProduction/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /ApproveTrafficShift/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Stop & roll back' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Send 10% to Green' }));
  expect(screen.getByRole('status')).toHaveTextContent('Blue 90% / Green 10%');
  fireEvent.click(screen.getByRole('button', { name: 'After 5 min → promote' }));
  expect(screen.getByRole('status')).toHaveTextContent('Green receives 100%');
  fireEvent.click(screen.getByRole('button', { name: /Reset/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Send 10% to Green' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stop & roll back' }));
  expect(screen.getByRole('status')).toHaveTextContent('automatic rollback to Blue 100%');
  expect(fetchSpy).not.toHaveBeenCalled();
  unmount(); fetchSpy.mockRestore();
});

it('opens the architecture from the portfolio illustration and restores focus on close', () => {
  render(<ProjectGallery locale="en" projects={[{ title: 'kongPortfolio', kind: 'personal', period: '2026.11', role: 'Developer', description: 'Personal website.', tags: ['React'], outcome: 'Deployed.' }]}/>);
  const entry = screen.getByRole('button', { name: 'Open project: kongPortfolio' });
  entry.focus();
  fireEvent.click(entry.querySelector('.architecture-thumbnail')!);
  expect(screen.getByRole('dialog', { name: 'The architecture of this site' })).toHaveAttribute('open');
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: /AWS Lambda/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(entry).toHaveFocus();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('opens a floating touch explanation, changes it on another node and dismisses it', () => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === mobileLayoutQuery, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  render(<ArchitectureExplorer locale="en"/>);
  const lambda = screen.getByRole('button', { name: /AWS Lambda/ });
  fireEvent.click(lambda);
  const bubble = screen.getByRole('tooltip');
  expect(bubble).toHaveClass('architecture-touch-tooltip');
  expect(bubble.style.left).not.toBe('');
  expect(lambda).toHaveAttribute('aria-describedby', bubble.id);
  expect(bubble.closest('.architecture-map-scroll')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Amazon Bedrock/ }));
  expect(screen.getByRole('tooltip')).toHaveTextContent('PREPARING');
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  fireEvent.click(lambda);
  fireEvent.click(lambda);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  fireEvent.click(lambda);
  fireEvent.scroll(screen.getByRole('region', { name: '01 / Architecture' }));
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

it('keeps a touch explanation inside the open dialog top layer and consumes Escape before closing it', () => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === mobileLayoutQuery, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  render(<ProjectGallery locale="en" projects={[{ title: 'kongPortfolio', kind: 'personal', period: '2026.11', role: 'Developer', description: 'Personal website.', tags: ['React'], outcome: 'Deployed.' }]}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Open project: kongPortfolio' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: /AWS Lambda/ }));
  expect(screen.getByRole('tooltip').parentElement).toBe(dialog);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  expect(dialog).toHaveAttribute('open');
});
