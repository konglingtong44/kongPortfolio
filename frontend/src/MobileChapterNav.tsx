import { useEffect, useState } from 'react';
import type { Locale } from './i18n';
import { tr } from './architectureData';
import { scrollToChapter } from './useChapterWheel';
import { useMobileLayout } from './useMobileLayout';

const chapters = [
  { id: 'home', section: 'introduction', title: ['紹介', '简介', 'Intro'] as const },
  { id: 'projects', section: 'projects', title: ['経験', '项目', 'Projects'] as const },
  { id: 'skills', section: 'skills', title: ['技術', '技术', 'Skills'] as const },
  { id: 'lab', section: 'lab', title: ['ツール', '工具', 'Tools'] as const },
] as const;

export function MobileChapterNav({ locale, ready }: { locale: Locale; ready: boolean }) {
  const mobile = useMobileLayout();
  const [current, setCurrent] = useState<string>('home');
  useEffect(() => {
    if (!mobile) return;
    let frame = 0;
    function update() {
      frame = 0;
      const marker = window.innerHeight * .3;
      const active = [...chapters].reverse().find(chapter => {
        const rect = document.getElementById(chapter.section)?.getBoundingClientRect();
        return rect && rect.top <= marker;
      });
      setCurrent(active?.id ?? 'home');
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [mobile, ready]);
  if (!mobile) return null;
  return <nav className="mobile-chapter-nav" aria-label={tr(['ページ内ナビゲーション', '章节导航', 'Chapter navigation'], locale)}>
    {chapters.map((chapter, index) => <a key={chapter.id} href={`#${chapter.id}`} aria-current={current === chapter.id ? 'location' : undefined} aria-disabled={!ready && (chapter.id === 'projects' || chapter.id === 'skills') || undefined} onClick={event => {
      event.preventDefault();
      if (ready || chapter.id === 'home' || chapter.id === 'lab') scrollToChapter(chapter.id);
    }}><span>{String(index + 1).padStart(2, '0')}</span>{tr(chapter.title, locale)}</a>)}
  </nav>;
}
