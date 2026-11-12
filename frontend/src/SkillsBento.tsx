import { useRef } from 'react';
import type { Profile } from './profile';
import type { Locale } from './i18n';
import { modulesCopy } from './modules';
import { PixelMark } from './PixelGarden';
import { scrollToChapter, useChapterWheel } from './useChapterWheel';
import './skills.css';

const copy = {
  ja: { intro: '言語・フレームワーク・データベースなど、技術の種類ごとに整理。関与した範囲は各項目とプロジェクト詳細に記載しています。', work: '実務・技術調査' },
  zh: { intro: '按语言、框架、数据库等技术种类整理；具体参与范围见各分类说明和项目详情。', work: '工作与技术调查' },
  en: { intro: 'Grouped by technology type: languages, frameworks, databases and more. Scope is described in each category and project detail.', work: 'Work & technical research' },
};
export function SkillsBento({ profile, locale }: { profile: Profile; locale: Locale }) {
  const t = copy[locale], m = modulesCopy[locale], root = useRef<HTMLElement>(null);
  useChapterWheel(root, direction => { if (direction < 0) scrollToChapter('projects'); }, true, 'skills');
  return <section ref={root} id="skills" className="section skills-section skills-layout" aria-labelledby="skills-title"><div className="section-heading"><p className="eyebrow">03 / {m.toolkitTitle}</p><h2 id="skills-title">{m.toolkitTitle}</h2><p>{t.intro}</p></div>
    <div className="skills-category-grid" role="group" aria-label={t.work}>
    {profile.skills.map((group, index) => <article className="bento-card technology-category" key={group.title}><div className="skill-card-heading"><span className="skill-index">{String(index + 1).padStart(2, '0')}</span><h3>{group.title}</h3><PixelMark variant={index}/></div>{group.description && <p>{group.description}</p>}<ul className="tags">{group.items.map(skill => <li key={skill}>{skill}</li>)}</ul></article>)}
    </div>
    <div className="skills-extras">
    <details className="qualifications bento-card" open><summary>{m.qualification}</summary><div>{profile.qualifications.map(q => <p key={q.name}><span>{q.date}</span><strong>{q.name}</strong></p>)}</div></details>
    </div></section>;
}
