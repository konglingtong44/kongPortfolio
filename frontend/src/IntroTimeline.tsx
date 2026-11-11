import type { Locale } from './i18n';
import { PixelGarden } from './PixelGarden';

const copy = {
  ja: {
    title: '学歴と職歴', present: '現在',
    entries: [
      { name: '遼寧師範大学', detail: '情報科学部・コンピュータサイエンス', role: '学士' },
      { name: 'A 社 · 中国側', detail: '業務システム開発', role: 'PG / SE' },
      { name: 'A 社 · 日本側', detail: '開発・基盤更改・チーム支援', role: 'SE → サブリーダー' },
      { name: 'B 社', detail: '業務システム開発・移行・案件推進', role: 'SE / サブリーダー / PMO' },
    ],
  },
  zh: {
    title: '学习与任职', present: '至今',
    entries: [
      { name: '辽宁师范大学', detail: '信息科学学院 · 计算机科学专业', role: '本科' },
      { name: 'A 社 · 中国侧', detail: '业务系统开发', role: 'PG / SE' },
      { name: 'A 社 · 日本侧', detail: '开发、平台升级与团队支援', role: 'SE → 副组长' },
      { name: 'B 社', detail: '业务开发、系统迁移与项目推进', role: 'SE / 副组长 / PMO' },
    ],
  },
  en: {
    title: 'Education & career', present: 'Present',
    entries: [
      { name: 'Liaoning Normal University', detail: 'Information Science · Computer Science', role: 'Bachelor’s degree' },
      { name: 'Company A · China', detail: 'Business system development', role: 'PG / SE' },
      { name: 'Company A · Japan', detail: 'Development, platform renewal & team support', role: 'SE → Sub-lead' },
      { name: 'Company B', detail: 'Development, migration & delivery support', role: 'SE / Sub-lead / PMO' },
    ],
  },
} as const;
const periods = [
  ['2014.09', '2018.06'], ['2018.06', '2019.04'],
  ['2019.05', '2023.05'], ['2023.06', null],
] as const;

export function IntroTimeline({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return <aside className="intro-timeline" aria-labelledby="intro-timeline-title">
    <div className="intro-timeline-art"><PixelGarden compact/></div>
    <div className="intro-timeline-content"><div className="intro-timeline-heading"><span aria-hidden="true">01 /</span><h2 id="intro-timeline-title">{t.title}</h2></div>
      <ol className="intro-milestones">{t.entries.map((entry, index) => <li key={entry.name}>
        <p className="intro-period"><time dateTime={periods[index][0].replace('.', '-')}>{periods[index][0]}</time><span>—</span>{periods[index][1] ? <time dateTime={periods[index][1]!.replace('.', '-')}>{periods[index][1]}</time> : t.present}</p>
        <div className="intro-milestone-title"><h3>{entry.name}</h3><span>{entry.role}</span></div>
        <p className="intro-milestone-detail">{entry.detail}</p>
      </li>)}</ol>
    </div>
  </aside>;
}
