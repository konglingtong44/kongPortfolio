import { useEffect, useRef, useState } from 'react';
import type { Profile } from './profile';
import type { Locale } from './i18n';
import { copy } from './i18n';
import { modulesCopy } from './modules';
import { Modal } from './Modal';
import { PixelGarden, PixelMark } from './PixelGarden';
import { scrollToChapter, useChapterWheel } from './useChapterWheel';
import { ArchitectureExplorer, ArchitectureThumbnail } from './ArchitectureExplorer';
import { architectureCopy, tr } from './architectureData';

type Project = Profile['projects'][number];
type Event = Profile['timeline'][number];
const homeLabel = { ja: '自己紹介へ', zh: '返回简介', en: 'Back to intro' };
const thisProjectLabel = { ja: '本プロジェクト', zh: '本项目', en: 'This project' };
export type JourneyEntry = { title: string; period: string; description: string; project?: Project; event?: Event };
const galleryCopy = {
  ja: { title: '経験とプロジェクト', hint: 'スクロールで一つずつ · 時間軸を選ぶと詳細へ', previous: '前のプロジェクト', next: '次のプロジェクト', open: 'プロジェクトを開く', label: '経験とプロジェクト一覧', career: 'これまでの経験', overview: '経歴・担当内容', skills: '技術スタックへ', timeline: '経歴の時間軸', team: '役割・チーム規模', tasks: '担当したこと', environment: '使用技術・環境', outcome: '成果・現在の状況' },
  zh: { title: '经历与项目', hint: '滚动翻看 · 点击左侧时间线前往详情', previous: '上一个项目', next: '下一个项目', open: '打开项目', label: '经历与项目列表', career: '个人经历', overview: '经历与职责', skills: '前往技术栈', timeline: '职业时间线', team: '角色与团队规模', tasks: '具体负责内容', environment: '技术栈与环境', outcome: '成果与当前状态' },
  en: { title: 'Experience & projects', hint: 'Scroll through · Select a timeline entry for details', previous: 'Previous project', next: 'Next project', open: 'Open project', label: 'Experience and projects', career: 'Career experience', overview: 'Experience & responsibilities', skills: 'View the toolkit', timeline: 'Career timeline', team: 'Role & team', tasks: 'Responsibilities', environment: 'Technologies & environment', outcome: 'Outcomes & current status' },
};
function date(period: string) {
  const match = period.match(/(\d{4})(?:[.\/-](\d{1,2}))?/);
  return match ? Number(match[1]) * 12 + Number(match[2] ?? 1) : 0;
}
export function newestProjects(projects: Profile['projects']) { return [...projects].sort((a, b) => date(b.period) - date(a.period)); }
export function journeyEntries(projects: Profile['projects'], timeline: Profile['timeline']): JourneyEntry[] {
  const used = new Set<Event>();
  const entries: JourneyEntry[] = projects.map(project => {
    const event = timeline.find(item => date(item.period) === date(project.period));
    if (event) used.add(event);
    // The PDF-backed timeline owns the canonical professional period.
    return { title: project.title, period: event?.period ?? project.period, description: project.description, project, event };
  });
  timeline.forEach(event => { if (!used.has(event)) entries.push({ ...event, event }); });
  return entries.sort((a, b) => date(b.period) - date(a.period));
}
export function ProjectGallery({ projects, timeline = [], locale }: { projects: Profile['projects']; timeline?: Profile['timeline']; locale: Locale }) {
  const t = copy[locale], m = modulesCopy[locale], g = galleryCopy[locale];
  const ordered = journeyEntries(projects, timeline).map(entry =>
    entry.project?.kind === 'personal' && entry.title === 'kongPortfolio'
      ? { ...entry, period: thisProjectLabel[locale] }
      : entry);
  const root = useRef<HTMLElement>(null), viewport = useRef<HTMLDivElement>(null), track = useRef<HTMLOListElement>(null);
  const [current, setCurrent] = useState(0), [fraction, setFraction] = useState(0), [selected, setSelected] = useState<number | null>(null);
  const target = useRef(0), settling = useRef(0), pendingOpen = useRef<number | null>(null), timer = useRef<number | undefined>(undefined);
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function cancelPending() { window.clearTimeout(timer.current); pendingOpen.current = null; }
  useEffect(() => () => cancelPending(), []);
  function position(index: number) {
    const item = track.current?.children[index] as HTMLElement | undefined;
    return item && viewport.current ? item.offsetLeft - (viewport.current.clientWidth - item.clientWidth) / 2 : 0;
  }
  function finishScroll() {
    settling.current = 0;
    syncScroll(false);
    const next = pendingOpen.current;
    if (next !== null && viewport.current && Math.abs(viewport.current.scrollLeft - position(next)) < 3) {
      pendingOpen.current = null; setSelected(next);
    }
  }
  function goTo(index: number, focus = false, openAfter = false) {
    cancelPending();
    const next = Math.max(0, Math.min(ordered.length - 1, index));
    target.current = next; setCurrent(next); settling.current = performance.now() + 650;
    const item = track.current?.children[next] as HTMLElement | undefined;
    const left = position(next);
    if (openAfter) pendingOpen.current = next;
    viewport.current?.scrollTo?.({ left, behavior: reduced() ? 'instant' : 'smooth' });
    if (focus) item?.querySelector('button')?.focus({ preventScroll: true });
    if (openAfter && viewport.current && Math.abs(viewport.current.scrollLeft - left) < 3) finishScroll();
    else timer.current = window.setTimeout(finishScroll, 850);
  }
  useChapterWheel(root, direction => {
    cancelPending();
    if (direction > 0 && target.current === ordered.length - 1) scrollToChapter('skills');
    else if (direction < 0 && target.current === 0) scrollToChapter('home');
    else goTo(target.current + direction);
  }, ordered.length > 0);
  const entry = selected === null ? null : ordered[selected];
  const isPortfolio = (item: JourneyEntry) => item.project?.kind === 'personal' && item.title === 'kongPortfolio';
  function syncScroll(schedule = true) {
    if (!viewport.current || !track.current) return;
    const first = track.current.children[0] as HTMLElement | undefined;
    const second = track.current.children[1] as HTMLElement | undefined;
    const step = first && second ? second.offsetLeft - first.offsetLeft : viewport.current.clientWidth;
    const progress = step > 0 ? Math.max(0, Math.min(ordered.length - 1, (viewport.current.scrollLeft - position(0)) / step)) : target.current;
    const nearest = Math.round(progress);
    setFraction(progress);
    if (performance.now() >= settling.current) { target.current = nearest; setCurrent(nearest); }
    if (schedule) { window.clearTimeout(timer.current); timer.current = window.setTimeout(finishScroll, 140); }
  }
  useEffect(() => {
    function restore() {
      // Re-read the actual horizontal position after manual vertical navigation or resize.
      if (performance.now() >= settling.current) syncScroll(false);
    }
    window.addEventListener('scroll', restore, { passive: true });
    window.addEventListener('resize', restore);
    return () => { window.removeEventListener('scroll', restore); window.removeEventListener('resize', restore); };
  }, [ordered.length]);
  return <section id="projects" ref={root} className="project-gallery chapter-screen" aria-labelledby="projects-title">
    <div id="journey" className="chapter-anchor"/>
    <div className="gallery-pin"><div className="gallery-heading wrap"><div><p className="eyebrow">02 / {t.journey} & {t.projects}</p><h2 id="projects-title">{g.title}</h2></div><p>{m.latest}<br/><span>{g.hint}</span></p><a className="gallery-home-button" href="#home" onClick={event => { event.preventDefault(); cancelPending(); scrollToChapter('home'); }}><span aria-hidden="true">↑</span>01 / {homeLabel[locale]}</a></div>
      <div className="gallery-body">
        <nav className="career-rail" aria-label={g.timeline}><div className="rail-center" aria-hidden="true"/><ol className="career-rail-track" style={{ transform: `translateY(${-fraction * 112 - 56}px)` }}>
          {ordered.map((item, i) => <li key={`${item.title}-${item.period}`}><button className={current === i ? 'rail-entry active' : 'rail-entry'} tabIndex={current === i ? 0 : -1} aria-current={current === i ? 'step' : undefined} onClick={() => goTo(i, false, true)} onKeyDown={event => {
            if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? ordered.length - 1 : Math.max(0, Math.min(ordered.length - 1, i + (event.key === 'ArrowDown' ? 1 : -1)));
            goTo(next);
            event.currentTarget.closest('ol')?.children[next]?.querySelector('button')?.focus({ preventScroll: true });
          }}><span className="rail-period">{item.period}</span><span className="rail-title">{item.title}</span></button></li>)}
        </ol></nav>
        <div className="gallery-viewport" ref={viewport} onScroll={() => syncScroll()} onScrollEnd={finishScroll} onPointerDown={cancelPending}><ol className="project-track" ref={track} aria-label={g.label}>
          {ordered.map((item, i) => <li className="project-item" key={`${item.title}-${item.period}`}><article><button className="project-ticket" aria-label={`${g.open}: ${item.title}`} aria-haspopup="dialog" onClick={() => { cancelPending(); setSelected(i); }} onFocus={() => { if (target.current !== i) goTo(i); }} onKeyDown={event => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); goTo(i + (event.key === 'ArrowRight' ? 1 : -1), true); }
            if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); goTo(event.key === 'Home' ? 0 : ordered.length - 1, true); }
          }}>
            <div className="ticket-top"><span>{item.period}</span><span>{String(i + 1).padStart(2, '0')}</span></div>
            <div className={`ticket-art ticket-art-${i % 4}`}>{isPortfolio(item) ? <ArchitectureThumbnail locale={locale}/> : item.project?.kind === 'personal' ? <PixelGarden compact/> : <PixelMark variant={i}/>}</div>
            <div className="ticket-copy"><span className="eyebrow">{item.project ? item.project.kind === 'personal' ? t.personal : t.work : g.career}</span><h3>{item.title}</h3><p className="ticket-description">{item.description}</p><p>{item.project?.tags.slice(0, 4).join(' / ') ?? item.period}</p></div><span className="ticket-open">{isPortfolio(item) ? tr(architectureCopy.bubble, locale) : g.open}<b aria-hidden="true">↗</b></span>
          </button></article></li>)}
        </ol></div>
      </div>
      {ordered.length > 0 && <div className="gallery-controls wrap"><span className="gallery-page" aria-live="polite">{String(current + 1).padStart(2, '0')} <span>/ {String(ordered.length).padStart(2, '0')}</span></span><a className="gallery-next-chapter pixel-chapter-button" href="#skills" onClick={event => { event.preventDefault(); cancelPending(); scrollToChapter('skills'); }}><span>03</span>{g.skills}<b aria-hidden="true">↓</b></a><div><button aria-label={g.previous} disabled={current === 0} onClick={() => goTo(current - 1)}>←</button><button aria-label={g.next} disabled={current === ordered.length - 1} onClick={() => goTo(current + 1)}>→</button></div></div>}
    </div>
    {entry && <Modal className={isPortfolio(entry) ? 'architecture-dialog' : ''} title={isPortfolio(entry) ? tr(architectureCopy.title, locale) : entry.title} kicker={`${g.title} / ${entry.period}`} closeLabel={m.close} onClose={() => setSelected(null)}>{isPortfolio(entry) ? <ArchitectureExplorer locale={locale}/> : <div className="project-detail"><span className="status-chip">{entry.project ? entry.project.kind === 'personal' ? t.personal : t.work : g.career}</span>{entry.project && <><h3>{g.team}</h3><p className="project-role">{entry.project.role}{entry.project.team && ` / ${entry.project.team}`}</p></>}<p>{entry.description}</p>{entry.project?.responsibilities?.length ? <><h3>{g.tasks}</h3><ol className="responsibility-list">{entry.project.responsibilities.map(task => <li key={task}>{task}</li>)}</ol></> : entry.event && entry.project && <><h3>{g.overview}</h3><p>{entry.event.description}</p></>}{entry.project && <>{entry.project.environment?.length ? <div className="project-environment"><h3>{g.environment}</h3>{entry.project.environment.map(group => <section key={group.title}><h4>{group.title}</h4><ul className="tags">{group.items.map(skill => <li key={skill}>{skill}</li>)}</ul></section>)}</div> : <ul className="tags">{entry.project.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>}<h3>{g.outcome}</h3><p>{entry.project.outcome}</p></>}</div>}</Modal>}
  </section>;
}
