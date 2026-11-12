import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { RollbackLab } from './RollbackLab';

afterEach(() => vi.useRealTimers());

it('keeps production on Blue before traffic shifts, including both approval gates', () => {
  const { container } = render(<RollbackLab locale="en"/>);
  for (const title of [/Build \/ STG failure/, /Issue at approval/, /Green check/]) {
    fireEvent.click(screen.getByRole('button', { name: title }));
    expect(screen.getByText('live → Blue · 100%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '04 Keep production' }));
    expect(screen.getByRole('status')).toHaveTextContent('no traffic rollback is needed');
    expect(container.querySelector('.rollback-command')).toBeNull();
    expect(screen.getByText('live → Blue · 100%')).toBeInTheDocument();
  }
});

it('distinguishes late incidents from active-deployment automation and states project scope', () => {
  render(<RollbackLab locale="en"/>);
  fireEvent.click(screen.getByRole('button', { name: /After release: page failure/ }));
  fireEvent.click(screen.getByRole('button', { name: '03 Detect & stop' }));
  expect(screen.getByRole('status')).toHaveTextContent('no continuous automatic rollback');
  expect(screen.getByText(/No dedicated one-click recovery action/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /After promotion: API failure/ }));
  expect(screen.getByText('live → Green · 100%')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '03 Detect & stop' }));
  expect(screen.getByRole('status')).toHaveTextContent('cannot be rolled back with Stop');
  fireEvent.click(screen.getByRole('button', { name: '04 Roll back' }));
  expect(screen.getByRole('status')).toHaveTextContent('both approvals');
  expect(screen.getByText(/currently has no login sessions, Redis or database/)).toBeInTheDocument();
});

it('walks through frontend failure and restores only the frontend pointer', () => {
  render(<RollbackLab locale="en"/>);
  fireEvent.click(screen.getByRole('button', { name: /During frontend publication/ }));
  expect(screen.getByText('LIVE → new release')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getByRole('status')).toHaveTextContent('static-asset verification failure');
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getByRole('status')).toHaveTextContent('release script detects');
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getByText('LIVE → previous release')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('backend Lambda stays in place');
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getByRole('status')).toHaveTextContent('Recheck public version.json');
  expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
});

it('distinguishes application detection from the configured CloudWatch alarm', () => {
  render(<RollbackLab locale="en"/>);
  fireEvent.click(screen.getByRole('button', { name: /Canary: application failure/ }));
  fireEvent.click(screen.getByRole('button', { name: '03 Detect & stop' }));
  expect(screen.getByRole('status')).toHaveTextContent('operator confirming');
  expect(screen.getByText(/Dedicated continuous detection/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Canary: alarm triggered/ }));
  expect(screen.getByRole('button', { name: 'Previous step' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '03 Detect & stop' }));
  expect(screen.getByRole('status')).toHaveTextContent('one live Error in 60 seconds');
  fireEvent.click(screen.getByRole('button', { name: '04 Roll back' }));
  expect(screen.getByText('live → Blue · 100%')).toBeInTheDocument();
  expect(screen.getByText(/alarm-triggered recovery has not been drilled/)).toBeInTheDocument();
});

it('plays, pauses, resets and cancels playback on scenario changes and unmount', () => {
  vi.useFakeTimers();
  const { unmount } = render(<RollbackLab locale="en"/>);
  fireEvent.click(screen.getByRole('button', { name: /During frontend publication/ }));
  fireEvent.click(screen.getByRole('button', { name: /Play animation/ }));
  act(() => vi.advanceTimersByTime(2400));
  expect(screen.getByRole('status')).toHaveTextContent('static-asset verification failure');
  fireEvent.click(screen.getByRole('button', { name: /Pause/ }));
  act(() => vi.advanceTimersByTime(4800));
  expect(screen.getByRole('status')).toHaveTextContent('static-asset verification failure');
  fireEvent.click(screen.getByRole('button', { name: /Play animation/ }));
  fireEvent.click(screen.getByRole('button', { name: /Canary: alarm triggered/ }));
  act(() => vi.advanceTimersByTime(4800));
  expect(screen.getByRole('status')).toHaveTextContent('During the canary');
  fireEvent.click(screen.getByRole('button', { name: /Play animation/ }));
  for (let index = 0; index < 4; index++) act(() => vi.advanceTimersByTime(2400));
  expect(screen.getByRole('status')).toHaveTextContent('Verify rollback success');
  expect(screen.queryByRole('button', { name: /Pause/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Play animation/ }));
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
