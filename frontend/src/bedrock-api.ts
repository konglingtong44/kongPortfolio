import type { Locale } from './i18n';

export type Question = { id: string; message: string };
export type Catalog = { enabled: boolean; questions: Question[] };
export type Answer = { status: 'ANSWER' | 'REFUSED'; answer: string; truncated: boolean } | { status: 'PREPARING' };

export class QaFailure extends Error {
  constructor(readonly kind: 'connection' | 'timeout' | 'limited' | 'unavailable', readonly retrySeconds = 0) { super(kind); }
}

function questions(value: unknown): value is Question[] {
  return Array.isArray(value) && value.length <= 32 && value.every(q => q && typeof q.id === 'string'
    && /^[a-z0-9-]{1,80}$/.test(q.id) && typeof q.message === 'string' && q.message.length > 0 && q.message.length <= 1000)
    && new Set(value.map(q => q.id)).size === value.length;
}

async function json(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) {
    if (response.status === 504) throw new QaFailure('timeout');
    if (response.status === 429) {
      const seconds = Number(response.headers.get('Retry-After'));
      throw new QaFailure('limited', Number.isFinite(seconds) && seconds > 0 ? Math.min(600, Math.ceil(seconds)) : 60);
    }
    throw new QaFailure(response.status === 502 || response.status === 503 ? 'unavailable' : 'connection');
  }
  const result: unknown = await response.json();
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new QaFailure('connection');
  return result as Record<string, unknown>;
}

export async function loadQuestions(locale: Locale, signal: AbortSignal): Promise<Catalog> {
  const response = await fetch(`/api/bedrock/questions?language=${locale}`, { signal, cache: 'no-store', redirect: 'error' });
  // The older production API can still report preparation status during rollout.
  if (response.status === 404) {
    const probe = await json(await fetch('/api/bedrock', { method: 'POST', signal, cache: 'no-store', redirect: 'error' }));
    if (probe.status !== 'PREPARING') throw new QaFailure('connection');
    return { enabled: false, questions: [] };
  }
  const data = await json(response);
  if (typeof data.enabled !== 'boolean' || !questions(data.questions) || (data.enabled && data.questions.length === 0)) throw new QaFailure('connection');
  return { enabled: data.enabled, questions: data.questions };
}

export async function askQuestion(message: string, locale: Locale, signal: AbortSignal): Promise<Answer> {
  const data = await json(await fetch('/api/bedrock', {
    method: 'POST', signal, cache: 'no-store', redirect: 'error', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, language: locale }),
  }));
  if (data.status === 'PREPARING') return { status: 'PREPARING' };
  if ((data.status !== 'ANSWER' && data.status !== 'REFUSED') || typeof data.answer !== 'string'
    || data.answer.trim().length === 0 || data.answer.length > 16000 || (data.status === 'ANSWER' && typeof data.truncated !== 'boolean')) throw new QaFailure('connection');
  return { status: data.status, answer: data.answer, truncated: data.status === 'ANSWER' && data.truncated === true };
}
