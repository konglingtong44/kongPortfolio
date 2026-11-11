import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BedrockEntry } from './BedrockEntry';
import { Modal } from './Modal';

afterEach(() => vi.unstubAllGlobals());

it.each([
  ['ja', 'もう少し、お待ちください。', 'わかりました'],
  ['zh', '正在准备中', '知道了'],
  ['en', 'Something is growing here.', 'Got it'],
] as const)('calls Java before showing the localized pixel popup in %s', async (locale, title, confirm) => {
  let finish: (value: Response) => void = () => {};
  const fetchMock = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; }));
  vi.stubGlobal('fetch', fetchMock);
  render(<Modal title="About" kicker="Kong" closeLabel="Close about" onClose={() => {}}><BedrockEntry locale={locale}/></Modal>);
  const button = screen.getByRole('button', { name: 'test' });
  button.focus(); fireEvent.click(button);
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith('/api/bedrock', expect.objectContaining({ method: 'POST', signal: expect.any(AbortSignal) }));
  expect(screen.queryByRole('dialog', { name: title })).not.toBeInTheDocument();
  await act(async () => finish({ ok: true, json: async () => ({ status: 'PREPARING' }) } as Response));
  const popup = await screen.findByRole('dialog', { name: title });
  expect(popup).toHaveClass('bedrock-dialog');
  expect(popup).toHaveTextContent('Amazon Bedrock');
  fireEvent.click(within(popup).getByRole('button', { name: confirm }));
  expect(screen.queryByRole('dialog', { name: title })).not.toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'About' })).toHaveAttribute('open');
  expect(button).toHaveFocus();
});

it.each(['network', 'http', 'invalid'])('shows an error instead of success for a %s failure and allows retry', async failure => {
  const fetchMock = vi.fn();
  if (failure === 'network') fetchMock.mockRejectedValueOnce(new Error('offline'));
  else fetchMock.mockResolvedValueOnce({ ok: failure !== 'http', json: async () => ({ status: 'unexpected' }) });
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ status: 'PREPARING' }) });
  vi.stubGlobal('fetch', fetchMock);
  render(<BedrockEntry locale="en"/>);
  fireEvent.click(screen.getByRole('button', { name: 'test' }));
  const error = await screen.findByRole('dialog', { name: 'Could not connect.' });
  expect(screen.queryByText('Amazon Bedrock chat is being prepared. Please check back soon.')).not.toBeInTheDocument();
  fireEvent.click(within(error).getByRole('button', { name: 'Got it' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'test' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'test' }));
  expect(await screen.findByRole('dialog', { name: 'Something is growing here.' })).toBeInTheDocument();
});

it('keeps the about popup open when the result popup is cancelled', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'PREPARING' }) }));
  const closeAbout = vi.fn();
  render(<Modal title="About" kicker="Kong" closeLabel="Close about" onClose={closeAbout}><BedrockEntry locale="en"/></Modal>);
  fireEvent.click(screen.getByRole('button', { name: 'test' }));
  const popup = await screen.findByRole('dialog', { name: 'Something is growing here.' });
  fireEvent(popup, new Event('cancel', { bubbles: true }));
  expect(closeAbout).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog', { name: 'About' })).toHaveAttribute('open');
});
