import { useEffect, useRef, useState } from 'react';
import type { Locale } from './i18n';
import { Modal } from './Modal';
import { PixelMark } from './PixelGarden';
import { askQuestion, loadQuestions, QaFailure, type Answer, type Catalog } from './bedrock-api';
import { qaCopy } from './bedrock-copy';
import './bedrock.css';

function Questions({ locale }: { locale: Locale }) {
  const t = qaCopy[locale];
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ question: string; response: Answer } | null>(null);
  const [error, setError] = useState<QaFailure['kind'] | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const request = useRef<AbortController | null>(null);
  const timeout = useRef<number | null>(null);
  const coolingUntil = useRef(0);
  const input = useRef<HTMLTextAreaElement | null>(null);
  const examples = useRef<HTMLDetailsElement | null>(null);
  const length = Array.from(message).length;
  const tooLong = length > 1000;

  useEffect(() => {
    if (!wait) return;
    const timer = window.setInterval(() => setWait(Math.max(0, Math.ceil((coolingUntil.current - Date.now()) / 1000))), 1000);
    return () => window.clearInterval(timer);
  }, [wait]);

  async function run(action: (signal: AbortSignal) => Promise<void>, timeoutMs: number) {
    if (request.current || Date.now() < coolingUntil.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(null);
    let timedOut = false;
    const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    timeout.current = timer;
    try { await action(controller.signal); }
    catch (failure) {
      if (request.current !== controller) return;
      const issue = timedOut ? new QaFailure('timeout') : failure instanceof QaFailure ? failure : new QaFailure('connection');
      setError(issue.kind);
      if (issue.kind === 'limited') {
        coolingUntil.current = Date.now() + issue.retrySeconds * 1000;
        setWait(issue.retrySeconds);
      }
    } finally {
      window.clearTimeout(timer);
      if (timeout.current === timer) timeout.current = null;
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  }

  function load() {
    void run(async signal => {
      const next = await loadQuestions(locale, signal);
      if (signal.aborted) return;
      setCatalog(next);
    }, 8000);
  }

  useEffect(() => {
    load();
    return () => {
      request.current?.abort(); request.current = null;
      if (timeout.current !== null) window.clearTimeout(timeout.current);
    };
  }, []);

  function ask() {
    const question = message.trim();
    if (!catalog?.enabled || !question || tooLong || request.current || Date.now() < coolingUntil.current) return;
    setResult(null);
    void run(async signal => {
      const response = await askQuestion(question, locale, signal);
      if (signal.aborted) return;
      if (response.status === 'PREPARING') setCatalog({ enabled: false, questions: [] });
      else setResult({ question, response });
    }, 32000);
  }

  const response = result?.response;
  return <div className="bedrock-content" aria-busy={busy}>
    <div className="bedrock-art" aria-hidden="true"><PixelMark variant={3}/></div>
    {catalog?.enabled && <p className="bedrock-scope">{t.scope}</p>}
    <div role="status" aria-live="polite">
      {busy && <p className="bedrock-progress">{catalog ? t.asking : t.loading}</p>}
      {catalog && !catalog.enabled && <p className="bedrock-preparing">{t.preparing}</p>}
    </div>
    {catalog?.enabled && <form className="bedrock-form" onSubmit={event => { event.preventDefault(); ask(); }}>
      <label htmlFor="bedrock-question">{t.label}</label>
      <textarea ref={input} id="bedrock-question" rows={4} maxLength={2000} value={message} placeholder={t.placeholder}
        aria-describedby="bedrock-input-help bedrock-input-count" aria-invalid={tooLong}
        disabled={busy || wait > 0} onChange={event => { setMessage(event.target.value); setResult(null); setError(null); }}/>
      <p id="bedrock-input-help" className="bedrock-input-help">{t.inputHelp}</p>
      <p id="bedrock-input-count" className={tooLong ? 'bedrock-warning' : 'bedrock-count'} role={tooLong ? 'alert' : undefined}>{t.count(length)}</p>
      <button className="primary-button" disabled={busy || wait > 0 || !message.trim() || tooLong} type="submit">{wait > 0 ? t.wait(wait) : busy ? t.asking : t.ask}</button>
      <details ref={examples} className="bedrock-examples">
        <summary>{t.examples}</summary>
        <ul>{catalog.questions.map(q => <li key={q.id}><button type="button" disabled={busy || wait > 0} onClick={() => {
          setMessage(q.message); setResult(null); setError(null);
          if (examples.current) examples.current.open = false;
          input.current?.focus();
        }}>{q.message}</button></li>)}</ul>
      </details>
    </form>}
    {error && <p className="bedrock-error" role="alert">{t[error]}</p>}
    {!catalog && !busy && <button className="primary-button" disabled={wait > 0} onClick={load}>{wait > 0 ? t.wait(wait) : t.retry}</button>}
    {result && response && response.status !== 'PREPARING' && <section className="bedrock-answer" aria-label={response.status === 'REFUSED' ? t.refused : t.answer} aria-live="polite">
      <p className="bedrock-question-text"><span>{t.question}</span>{result.question}</p>
      <h3>{response.status === 'REFUSED' ? t.refused : t.answer}</h3>
      {response.truncated && <p className="bedrock-warning" role="status">{t.truncated}</p>}
      <p className="bedrock-answer-text">{response.answer}</p>
    </section>}
    {catalog?.enabled && <p className="bedrock-note">{t.note}</p>}
  </div>;
}

export function BedrockEntry({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const t = qaCopy[locale];
  return <>
    <button className="primary-button bedrock-button" onClick={event => { event.currentTarget.focus(); setOpen(true); }}>{t.button}</button>
    {open && <Modal title={t.title} titleId="bedrock-title" className="bedrock-dialog" kicker="Kong / Q&A" closeLabel={t.close} onClose={() => setOpen(false)}>
      <Questions key={locale} locale={locale}/>
    </Modal>}
  </>;
}
