import { useEffect, useRef, useState } from 'react';
import type { Locale } from './i18n';
import { Modal } from './Modal';
import { PixelMark } from './PixelGarden';
import './bedrock.css';

const copy = {
  ja: { loading: '確認中…', title: 'もう少し、お待ちください。', message: 'Amazon Bedrock の対話機能は準備中です。公開まで、しばらくお待ちください。', errorTitle: '接続できませんでした。', error: 'サーバーへの接続を確認して、もう一度お試しください。', close: '閉じる', ok: 'わかりました' },
  zh: { loading: '连接中…', title: '正在准备中', message: 'Amazon Bedrock 对话功能正在准备中，敬请期待。', errorTitle: '暂时连接不上', error: '无法连接服务器，请稍后再试。', close: '关闭', ok: '知道了' },
  en: { loading: 'Connecting…', title: 'Something is growing here.', message: 'Amazon Bedrock chat is being prepared. Please check back soon.', errorTitle: 'Could not connect.', error: 'Please check the server connection and try again.', close: 'Close', ok: 'Got it' },
};

export function BedrockEntry({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'ready' | 'error' | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); }, []);

  async function test() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('/api/bedrock', { method: 'POST', signal: controller.signal });
      if (!response.ok) throw new Error('Request failed');
      const data = await response.json();
      if (data.status !== 'PREPARING') throw new Error('Unexpected response');
      setResult('ready');
    } catch { setResult('error'); }
    finally {
      window.clearTimeout(timeout);
      request.current = null;
      setBusy(false);
    }
  }

  return <>
    <button className="primary-button bedrock-button" disabled={busy} aria-busy={busy} onClick={() => void test()}>{busy ? t.loading : 'test'}</button>
    {result && <Modal title={result === 'ready' ? t.title : t.errorTitle} titleId="bedrock-title" className="bedrock-dialog" kicker="Kong / Amazon Bedrock" closeLabel={t.close} onClose={() => setResult(null)}>
      <div className="bedrock-art" aria-hidden="true"><PixelMark variant={3}/></div>
      <p>{result === 'ready' ? t.message : t.error}</p>
      <button className="primary-button" onClick={() => setResult(null)}>{t.ok}</button>
    </Modal>}
  </>;
}
