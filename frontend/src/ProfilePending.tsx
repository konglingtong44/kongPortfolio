import { useEffect, useState } from 'react';
import type { Locale } from './i18n';
import { copy } from './i18n';
import { modulesCopy } from './modules';
import { galleryCopy, homeLabel, mobileHint } from './ProjectGallery';
import { PixelMark } from './PixelGarden';
import './profile-pending.css';

const text = {
  ja: { title: 'コンテンツを準備しています', note: '経歴とプロジェクトを読み込んでいます。準備ができ次第、表示します。', slow: 'いつもより時間がかかっています。もう少しお待ちください。', error: 'コンテンツを読み込めませんでした', skills: '技術スタックを準備しています' },
  zh: { title: '内容准备中', note: '正在读取经历与项目，准备好后会自动显示。', slow: '这次读取比平时久一些，请稍候。', error: '暂时无法读取内容', skills: '正在准备技术栈' },
  en: { title: 'Getting things ready', note: 'Loading experience and projects. They will appear as soon as they are ready.', slow: 'This is taking a little longer than usual. Please wait.', error: 'Content could not be loaded', skills: 'Preparing the toolkit' },
};

export function ProfilePending({ locale, status, onRetry }: { locale: Locale; status: 'loading' | 'error'; onRetry: () => void }) {
  const [slow, setSlow] = useState(false);
  const t = text[locale], m = modulesCopy[locale], g = galleryCopy[locale];
  useEffect(() => {
    if (status !== 'loading') return;
    const timer = window.setTimeout(() => setSlow(true), 10000);
    return () => window.clearTimeout(timer);
  }, [status]);
  return <>
    <section id="projects" className="project-gallery chapter-screen profile-pending" aria-labelledby="projects-title" aria-busy={status === 'loading'}>
      <div id="journey" className="chapter-anchor"/>
      <div className="gallery-pin">
        <div className="gallery-heading wrap"><div><p className="eyebrow">02 / {copy[locale].journey} & {copy[locale].projects}</p><h2 id="projects-title">{g.title}</h2></div><p>{m.latest}<br/><span className="gallery-hint-desktop">{g.hint}</span><span className="gallery-hint-mobile">{mobileHint[locale]}</span></p><a className="gallery-home-button" href="#home"><span aria-hidden="true">↑</span>01 / {homeLabel[locale]}</a></div>
        <div className="gallery-body">
          <div className="pending-rail" aria-hidden="true">{[0, 1, 2, 3].map(i => <div key={i}><span/><span/></div>)}</div>
          <div className="pending-viewport">
            <div className="pending-card">
              <div className="pending-card-top" aria-hidden="true"><span/><span/></div>
              <div className="pending-message" role={status === 'error' ? 'alert' : 'status'}>
                <div aria-hidden="true"><PixelMark variant={3}/></div>
                <h3>{status === 'error' ? t.error : t.title}</h3>
                <p>{status === 'error' ? copy[locale].error : slow ? t.slow : t.note}</p>
                {status === 'loading' ? <div className="pending-progress" role="progressbar" aria-label={t.note}><span/></div>
                  : <button className="primary-button" onClick={onRetry}>{copy[locale].retry} ↻</button>}
              </div>
              <div className="pending-card-bottom" aria-hidden="true"><span/><span/><span/></div>
            </div>
          </div>
        </div>
        <div className="gallery-controls wrap pending-controls"><span className="gallery-page" aria-hidden="true">— / —</span><a className="gallery-next-chapter pixel-chapter-button" href="#skills"><span>03</span>{g.skills}<b aria-hidden="true">↓</b></a><div><button disabled aria-label={g.previous}>←</button><button disabled aria-label={g.next}>→</button></div></div>
      </div>
    </section>
    <section id="skills" className="section skills-section skills-layout pending-skills" aria-labelledby="skills-title" aria-busy={status === 'loading'}>
      <div className="section-heading"><p className="eyebrow">03 / {m.toolkitTitle}</p><h2 id="skills-title">{m.toolkitTitle}</h2><p>{status === 'loading' ? t.skills : t.error}</p></div>
      <div className="skills-category-grid" aria-hidden="true">{[0, 1, 2, 3].map(i => <div className="bento-card pending-skill" key={i}><span/><span/><span/></div>)}</div>
    </section>
  </>;
}
