import { useEffect, useRef, useState } from 'react';
import type { Locale } from './i18n';
import { Modal } from './Modal';
import { PixelMark } from './PixelGarden';
import './bedrock.css';

const copy = {
  ja: { loading: '確認中…', button: '準備状況を確認', title: 'Q&A は準備中です', message: 'Amazon Bedrock を使う Q&A はまだ利用できません。現在の API は準備状況のみを返し、モデルは呼び出していません。', errorTitle: '接続できませんでした。', error: 'サーバーへの接続を確認して、もう一度お試しください。', close: '閉じる', ok: 'わかりました' },
  zh: { loading: '查询中…', button: '查看准备状态', title: '问答功能准备中', message: 'Amazon Bedrock 问答尚未开放。当前 API 只返回准备状态，不调用模型。', errorTitle: '暂时连接不上', error: '无法连接服务器，请稍后再试。', close: '关闭', ok: '知道了' },
  en: { loading: 'Checking…', button: 'Check availability', title: 'Q&A is not available yet', message: 'Amazon Bedrock Q&A is not connected. The current API only reports preparation status and calls no model.', errorTitle: 'Could not connect.', error: 'Please check the server connection and try again.', close: 'Close', ok: 'Got it' },
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
    <button className="primary-button bedrock-button" disabled={busy} aria-busy={busy} onClick={() => void test()}>{busy ? t.loading : t.button}</button>
    {result && <Modal title={result === 'ready' ? t.title : t.errorTitle} titleId="bedrock-title" className="bedrock-dialog" kicker="Kong / Amazon Bedrock" closeLabel={t.close} onClose={() => setResult(null)}>
      <div className="bedrock-art" aria-hidden="true"><PixelMark variant={3}/></div>
      <p>{result === 'ready' ? t.message : t.error}</p>
      <button className="primary-button" onClick={() => setResult(null)}>{t.ok}</button>
    </Modal>}
  </>;
}
