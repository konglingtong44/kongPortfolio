import { useRef } from 'react';
import type { Profile } from './profile';
import type { Locale } from './i18n';
import { modulesCopy } from './modules';
import { PixelMark } from './PixelGarden';
import { scrollToChapter, useChapterWheel } from './useChapterWheel';
import './skills.css';

const copy = {
  ja: { intro: '言語・フレームワーク・データベースなど、技術の種類ごとに整理。関与した範囲は各項目とプロジェクト詳細に記載しています。', work: '実務・技術調査', site: 'このサイトの技術', siteDescription: 'このポートフォリオのローカル実装。AWS デプロイと Bedrock の接続は後続計画です。' },
  zh: { intro: '按语言、框架、数据库等技术种类整理；具体参与范围见各分类说明和项目详情。', work: '工作与技术调查', site: '本站使用的技术', siteDescription: '当前作品集的本地实现，AWS 部署和 Bedrock 接入仍为后续计划。' },
  en: { intro: 'Grouped by technology type: languages, frameworks, databases and more. Scope is described in each category and project detail.', work: 'Work & technical research', site: 'This website’s technology', siteDescription: 'The local portfolio implementation. AWS deployment and Bedrock integration remain planned.' },
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
    <article className="bento-card site-technology"><div className="skill-card-heading"><h3>{t.site}</h3><PixelMark/></div><p>{t.siteDescription}</p><ul className="tags">{['React','TypeScript','Vite','Java 21','Spring Boot','Docker / Compose','Vitest','JUnit'].map(skill => <li key={skill}>{skill}</li>)}</ul></article>
    </div></section>;
}
