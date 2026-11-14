import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BedrockEntry } from './BedrockEntry';
import { Modal } from './Modal';
import { qaCopy } from './bedrock-copy';

const choices = [{ id: 'introduction', message: 'Tell me about yourself.' }, { id: 'career', message: 'Summarize your work experience.' }];
const reply = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers });
const catalog = () => reply({ enabled: true, questions: choices });
const answer = (text = 'Reviewed career summary.', truncated = false) => reply({ status: 'ANSWER', answer: text, truncated });
const settle = async () => { await act(async () => {}); };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

async function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Open profile Q&A' }));
  await screen.findByRole('combobox');
}

it.each(['ja', 'zh', 'en'] as const)('loads questions without generation, then submits only the selected question in %s', async locale => {
  let finish: (response: Response) => void = () => {};
  const fetchMock = vi.fn().mockResolvedValueOnce(catalog()).mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
  vi.stubGlobal('fetch', fetchMock);
  const t = qaCopy[locale];
  render(<BedrockEntry locale={locale}/>);
  fireEvent.click(screen.getByRole('button', { name: t.button }));
  const select = await screen.findByRole('combobox', { name: t.label });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith(`/api/bedrock/questions?language=${locale}`, expect.objectContaining({ cache: 'no-store' }));
  fireEvent.change(select, { target: { value: 'career' } });
  const ask = screen.getByRole('button', { name: t.ask });
  fireEvent.click(ask); fireEvent.click(ask);
  expect(ask).toBeDisabled(); expect(select).toBeDisabled();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const init = fetchMock.mock.calls[1][1];
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body)).toEqual({ message: choices[1].message, language: locale });
  await act(async () => finish(answer()));
  expect(await screen.findByRole('region', { name: t.answer })).toHaveTextContent('Reviewed career summary.');
  expect(ask).toBeEnabled();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('renders refusal and truncation notices and treats model text as text, never HTML', async () => {
  const text = '<img src=x onerror=alert(1)>\nA partial answer.';
  const fetchMock = vi.fn().mockResolvedValueOnce(catalog()).mockResolvedValueOnce(reply({ status: 'REFUSED', answer: 'Only reviewed career questions are available.' })).mockResolvedValueOnce(answer(text, true));
  vi.stubGlobal('fetch', fetchMock);
  render(<BedrockEntry locale="en"/>); await open();
  fireEvent.click(screen.getByRole('button', { name: 'Ask this question' }));
  expect(await screen.findByRole('region', { name: 'Available question topics' })).toHaveTextContent('Only reviewed career questions');
  fireEvent.click(screen.getByRole('button', { name: 'Ask this question' }));
  const region = await screen.findByRole('region', { name: 'AI answer' });
  expect(region).toHaveTextContent('<img src=x onerror=alert(1)>');
  expect(region.querySelector('img')).toBeNull();
  expect(region).toHaveTextContent('incomplete');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'career' } });
  expect(screen.queryByRole('region', { name: 'AI answer' })).not.toBeInTheDocument();
});

it.each(['network', 'http', 'gateway-timeout', 'invalid'] as const)('shows a safe error for %s without automatic retry or exposing server details', async failure => {
  const fetchMock = vi.fn().mockResolvedValueOnce(catalog());
  if (failure === 'network') fetchMock.mockRejectedValueOnce(new Error('private upstream details'));
  else fetchMock.mockResolvedValueOnce(reply({ status: 'UNEXPECTED', answer: 'private upstream details' }, failure === 'http' ? 503 : failure === 'gateway-timeout' ? 504 : 200));
  fetchMock.mockResolvedValue(answer());
  vi.stubGlobal('fetch', fetchMock);
  render(<BedrockEntry locale="en"/>); await open();
  fireEvent.click(screen.getByRole('button', { name: 'Ask this question' }));
  expect(await screen.findByRole('alert')).not.toHaveTextContent('private upstream details');
  if (failure === 'gateway-timeout') expect(screen.getByRole('alert')).toHaveTextContent('No automatic retry');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Ask this question' }));
  await screen.findByRole('region', { name: 'AI answer' });
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it('honors Retry-After, prevents submissions during cooldown, and never retries automatically', async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn().mockResolvedValueOnce(catalog()).mockResolvedValueOnce(reply({}, 429, { 'Retry-After': '60' })).mockResolvedValue(answer());
  vi.stubGlobal('fetch', fetchMock);
  render(<BedrockEntry locale="en"/>);
  fireEvent.click(screen.getByRole('button', { name: 'Open profile Q&A' })); await settle();
  fireEvent.click(screen.getByRole('button', { name: 'Ask this question' })); await settle();
  expect(screen.getByRole('button', { name: 'Please wait 60 seconds' })).toBeDisabled();
  await act(async () => vi.advanceTimersByTime(59000));
  expect(screen.getByRole('button', { name: 'Please wait 1 second' })).toBeDisabled();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await act(async () => vi.advanceTimersByTime(1000));
  expect(screen.getByRole('button', { name: 'Ask this question' })).toBeEnabled();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('aborts an unanswered generation at 32 seconds, shows timeout, and makes no retry', async () => {
  vi.useFakeTimers();
  let signal: AbortSignal | undefined;
  const fetchMock = vi.fn().mockResolvedValueOnce(catalog()).mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
    signal = init.signal; signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  }));
  vi.stubGlobal('fetch', fetchMock);
  render(<BedrockEntry locale="en"/>);
  fireEvent.click(screen.getByRole('button', { name: 'Open profile Q&A' })); await settle();
  fireEvent.click(screen.getByRole('button', { name: 'Ask this question' }));
  await act(async () => vi.advanceTimersByTime(32000));
  expect(signal?.aborted).toBe(true);
  expect(screen.getByRole('alert')).toHaveTextContent('No automatic retry');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('aborts on close, ignores late responses, restores focus, and keeps the parent modal open', async () => {
  let finish: (response: Response) => void = () => {};
  const fetchMock = vi.fn().mockResolvedValueOnce(catalog()).mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
  vi.stubGlobal('fetch', fetchMock);
  const closeParent = vi.fn();
  render(<Modal title="About" kicker="Kong" closeLabel="Close about" onClose={closeParent}><BedrockEntry locale="en"/></Modal>);
  const entry = screen.getByRole('button', { name: 'Open profile Q&A' }); entry.focus(); await open();
  fireEvent.click(screen.getByRole('button', { name: 'Ask this question' }));
  const signal = fetchMock.mock.calls[1][1].signal as AbortSignal;
  fireEvent(screen.getByRole('dialog', { name: 'Experience and projects' }), new Event('cancel', { bubbles: true }));
  expect(signal.aborted).toBe(true); expect(closeParent).not.toHaveBeenCalled(); expect(entry).toHaveFocus();
  await act(async () => finish(answer('Late answer')));
  expect(screen.queryByText('Late answer')).not.toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'About' })).toHaveAttribute('open');
});

it('clears and aborts the previous language request when the locale changes', async () => {
  let finish: (response: Response) => void = () => {};
  const fetchMock = vi.fn().mockResolvedValueOnce(catalog()).mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; })).mockResolvedValueOnce(catalog());
  vi.stubGlobal('fetch', fetchMock);
  const view = render(<BedrockEntry locale="en"/>); await open();
  fireEvent.click(screen.getByRole('button', { name: 'Ask this question' }));
  const signal = fetchMock.mock.calls[1][1].signal as AbortSignal;
  view.rerender(<BedrockEntry locale="zh"/>);
  expect(signal.aborted).toBe(true);
  await screen.findByRole('combobox', { name: '你想了解什么' });
  expect(fetchMock.mock.calls[2][0]).toBe('/api/bedrock/questions?language=zh');
  await act(async () => finish(answer('Old language answer')));
  expect(screen.queryByText('Old language answer')).not.toBeInTheDocument();
});

it.each([true, false])('shows preparation for %s legacy API fallback without a model request', async legacy => {
  const fetchMock = legacy ? vi.fn().mockResolvedValueOnce(reply({}, 404)).mockResolvedValueOnce(reply({ status: 'PREPARING' }))
    : vi.fn().mockResolvedValueOnce(reply({ enabled: false, questions: choices }));
  vi.stubGlobal('fetch', fetchMock); render(<BedrockEntry locale="en"/>);
  fireEvent.click(screen.getByRole('button', { name: 'Open profile Q&A' }));
  expect(await screen.findByText(/Q&A is being prepared/)).toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  if (legacy) expect(fetchMock.mock.calls[1][1]).not.toHaveProperty('body');
  expect(fetchMock).toHaveBeenCalledTimes(legacy ? 2 : 1);
});

it('can reload a malformed question catalog without calling the model', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(reply({ enabled: true, questions: [] })).mockResolvedValueOnce(catalog());
  vi.stubGlobal('fetch', fetchMock); render(<BedrockEntry locale="en"/>);
  fireEvent.click(screen.getByRole('button', { name: 'Open profile Q&A' }));
  await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: 'Reload questions' }));
  await screen.findByRole('combobox');
  expect(fetchMock.mock.calls.every(call => call[1]?.method !== 'POST')).toBe(true);
});

it('handles an environment switched off between loading and asking', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(catalog()).mockResolvedValueOnce(reply({ status: 'PREPARING' })));
  render(<BedrockEntry locale="en"/>); await open();
  fireEvent.click(screen.getByRole('button', { name: 'Ask this question' }));
  await screen.findByText(/Q&A is being prepared/);
  await waitFor(() => expect(screen.queryByRole('combobox')).not.toBeInTheDocument());
  expect(within(screen.getByRole('dialog')).queryByRole('region')).not.toBeInTheDocument();
});
