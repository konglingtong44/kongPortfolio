import { useEffect, useRef, useState } from 'react';
import { copy, initialLocale, locales, rememberLocale, type Locale } from './i18n';
import { isProfile, type Profile } from './profile';
import { modules, modulesCopy, type ModuleId } from './modules';
import { RegexLab } from './RegexLab';
import { Modal } from './Modal';
import { BedrockEntry } from './BedrockEntry';
import { PixelMark } from './PixelGarden';
import { ProjectGallery } from './ProjectGallery';
import { SkillsBento } from './SkillsBento';
import { IntroTimeline } from './IntroTimeline';
import './intro.css';
import { scrollToChapter, useChapterWheel } from './useChapterWheel';

type ProfileState = { status: 'loading' | 'error'; locale: Locale } | { status: 'ready'; locale: Locale; profile: Profile };
const labels = { ja: '日本語', zh: '中文', en: 'EN' };

function FloatingModule({ id, locale, profile, onClose }: { id: ModuleId; locale: Locale; profile: Profile | null; onClose: () => void }) {
  const t = modulesCopy[locale];
  return <Modal title={t[id]} kicker={`Kong / ${modules.find(m => m.id === id)?.number}`} closeLabel={t.close} onClose={onClose}>
    {id === 'regex' && <RegexLab locale={locale}/>}
    {id === 'about' && <div className="bedrock-placeholder"><div className="about-pixel"><PixelMark variant={3}/></div><BedrockEntry locale={locale}/><h3>{t.noChat}</h3><p>{t.bedrock}</p>{profile && <p className="about-preview">{profile.name} / {profile.role}</p>}</div>}
    {id === 'system' && <div className="system-content"><span className="status-chip">{t.status}</span><h3>{t.architecture}</h3><p>{t.localText}</p><div className="flow local-flow">{['Browser', 'React + Vite', 'Spring Boot', 'JSON'].map((name, i) => <div key={name}><span>0{i + 1}</span><strong>{name}</strong>{i < 3 && <b aria-hidden="true">→</b>}</div>)}</div><span className="status-chip planned">{t.futureStatus}</span><h3>{t.delivery}</h3><p>{t.futureText}</p><ol className="pipeline">{['GitHub', 'AWS CodeConnections', 'CodePipeline', 'CodeBuild', 'Amazon ECR', t.bluegreen].map((name, i) => <li key={name}><span>{String(i + 1).padStart(2, '0')}</span>{name}</li>)}</ol>{profile && <details className="development-note"><summary>{t.notes} ↗</summary><h4>{profile.note.title}</h4>{profile.note.paragraphs.map(p => <p key={p}>{p}</p>)}</details>}</div>}
  </Modal>;
}
export default function App() {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ProfileState>({ status: 'loading', locale });
  const [active, setActive] = useState<ModuleId | null>(null), [menu, setMenu] = useState(false);
  const t = copy[locale], m = modulesCopy[locale];
  const profile = state.status === 'ready' && state.locale === locale ? state.profile : null;
  const status = state.locale === locale ? state.status : 'loading';
  const home = useRef<HTMLElement>(null);
  useChapterWheel(home, () => scrollToChapter('projects'), !!profile, 'intro');
  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : locale;
    document.title = `kongPortfolio — ${m.intro}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.description);
  }, [locale, t, m]);
  useEffect(() => {
    const controller = new AbortController(); let live = true;
    setState({ status: 'loading', locale });
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    async function load() {
      try {
        const response = await fetch(`/api/profile?lang=${locale}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Profile request failed');
        const data: unknown = await response.json();
        if (!isProfile(data)) throw new Error('Invalid profile');
        if (live) setState({ status: 'ready', locale, profile: data });
      } catch { if (live) setState({ status: 'error', locale }); }
      finally { window.clearTimeout(timeout); }
    }
    void load();
    return () => { live = false; controller.abort(); window.clearTimeout(timeout); };
  }, [locale, attempt]);
  return <>
    <a className="skip-link" href="#main">{t.skip}</a>
    <header className="site-header" id="home"><a className="wordmark" href="#home">kong<span>Portfolio</span><i/></a><nav className="chapter-nav" aria-label={m.menu}><a href="#projects">{m.experienceTitle}</a><a href="#skills">{m.toolkitTitle}</a><a href="#lab">{m.tools}</a></nav><div className="language-switch" role="group" aria-label={t.language}>{locales.map(l => <button key={l} lang={l} aria-pressed={locale === l} onClick={() => { rememberLocale(l); setActive(null); setLocale(l); }}>{labels[l]}</button>)}</div></header>
    <aside className={`edge-nav ${menu ? 'expanded' : ''}`} onMouseEnter={() => setMenu(true)} onMouseLeave={() => setMenu(false)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setMenu(false); }} onKeyDown={e => { if (e.key === 'Escape') { setMenu(false); e.currentTarget.querySelector('button')?.focus(); } }}><button className="edge-handle" aria-label={m.menu} aria-expanded={menu} aria-controls="edge-menu" onClick={() => setMenu(!menu)}><span/><span/><span/></button><nav id="edge-menu" aria-label={m.menu} inert={!menu}><p>EXPLORE</p>{[['home', t.about], ['projects', m.experienceTitle], ['skills', m.toolkitTitle], ['lab', m.tools]].map(([id, label], i) => <a href={`#${id}`} key={id} onClick={() => setMenu(false)}><span>0{i + 1}</span>{label}<b>↗</b></a>)}</nav></aside>
    <main id="main">
      <section id="introduction" ref={home} className="home-section wrap intro-layout" aria-labelledby="hero-title">
        <div className="home-topline"><span className="eyebrow">{m.gardenLabel}</span><span className="home-index">01 — 04</span></div>
        <div className="home-layout"><div className="home-copy"><p className="greeting">{t.greeting}</p><h1 id="hero-title">kong<span>Portfolio<span className="pixel-period">.</span></span></h1><p className="hero-role">{profile?.role ?? m.role} / Java · Web · Cloud</p><p className="hero-intro">{profile?.introduction ?? t.subtitle}</p><a className="primary-button" href="#projects">{t.cta}<span aria-hidden="true">→</span></a></div><IntroTimeline locale={locale}/></div>
        <div className="home-bottom"><span>{m.gardenFooter}</span><a href="#projects">{t.journey}<span aria-hidden="true">↓</span></a></div>
      </section>
      <div className="content-status" aria-live="polite" aria-busy={status === 'loading'}>{status === 'loading' && <p role="status">{t.loading}</p>}{status === 'error' && <div role="alert"><p>{t.error}</p><button className="primary-button" onClick={() => setAttempt(a => a + 1)}>{t.retry} ↻</button></div>}</div>
      {profile && <ProjectGallery key={locale} projects={profile.projects} timeline={profile.timeline} locale={locale}/>}
      {profile && <SkillsBento profile={profile} locale={locale}/>}
      <section className="lab-section" id="lab"><div className="section-heading"><p className="eyebrow">04 / {m.tools}</p><h2>{m.labTitle}</h2><p>{m.labIntro}</p></div><div className="module-grid">{modules.map(module => <button className={`module-card module-${module.id}`} key={module.id} onClick={() => setActive(module.id)}><span className="module-number">{module.number} / {module.id.toUpperCase()}</span><span className="module-glyph" aria-hidden="true">{module.id === 'regex' ? <span>.*</span> : <PixelMark variant={module.id === 'about' ? 3 : 0}/>}</span><h3>{m[module.id]}</h3><p>{m[`${module.id}Sub`]}</p><span className="module-open">{module.id === 'about' ? m.pending : m.open}<b>↗</b></span></button>)}</div><p className="lab-footnote">{m.more}</p></section>
    </main>
    <footer><a className="wordmark" href="#home">kong<span>Portfolio</span><i/></a><p>Java · React · Spring Boot</p><a href="#home">{m.back} ↑</a></footer>
    {active && <FloatingModule id={active} locale={locale} profile={profile} onClose={() => setActive(null)}/>}
  </>;
}
