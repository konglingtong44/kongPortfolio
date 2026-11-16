import { useState } from 'react';
import type { Locale } from './i18n';
import { tr, type Text } from './architectureData';
import { ConnectionMap } from './ConnectionMap';
import { rollbackCopy } from './rollbackData';
import { recoveryGuideCopy, releaseHazards } from './recoveryGuide';
import { recoveryGraph, recoveryGroups } from './recoveryMapData';

const c = {
  intro: ['旧版をBlue、新版をGreenとして、失敗を見つけてから接続先を戻すまでを示します。公開前の検証失敗・承認拒否では、利用者は旧版のままです。', 'Blue 是旧版，Green 是新版。这里展示发现故障后由谁判断、如何恢复请求去向；若在公开前检查失败或审批被拒，访客继续使用旧版。', 'Blue is the old version and Green the new one. These flows show who detects a fault, who decides and how routing is restored. Failed pre-release checks or rejected approvals leave visitors on the old version.'],
  choose: ['発生条件', '具体情况', 'Specific case'],
  before: ['問題が起きた時', '出问题时', 'When the fault occurs'],
  after: ['対処後の結果', '处理后的结果', 'After handling'],
  control: ['上段：検知・判断・復旧操作', '上方：检测、判断和恢复操作', 'Above: detection, decisions and recovery actions'],
  traffic: ['下段：本番リクエストの配信先', '下方：生产请求的流向', 'Below: production request routing'],
  idle: ['破線：本番リクエストなし', '虚线：无生产流量', 'Dashed: no production traffic'],
  implementation: ['実装範囲と復旧の条件', '实现范围与恢复条件', 'Implementation scope and recovery conditions'],
  hazards: ['共有データ・互換性の注意点', '共享数据与兼容性注意事项', 'Shared data and compatibility considerations'],
} satisfies Record<string, Text>;

export function RollbackLab({ locale }: { locale: Locale }) {
  const [groupId, setGroupId] = useState(recoveryGroups[0].id);
  const [routeId, setRouteId] = useState(recoveryGroups[0].routes[0].id);
  const [selection, setSelection] = useState('failure');
  const [recovered, setRecovered] = useState(false);
  const group = recoveryGroups.find(item => item.id === groupId)!;
  const route = group.routes.find(item => item.id === routeId)!;
  const { nodes, edges } = recoveryGraph(route, recovered);
  const selected = nodes.find(node => node.id === selection) ?? nodes[0];
  function selectRoute(id: string) { setRouteId(id); setSelection('failure'); setRecovered(false); }
  return <section className="rollback-lab" aria-labelledby="rollback-title">
    <h3 id="rollback-title">{tr(rollbackCopy.title, locale)}</h3>
    <p className="rollback-intro">{tr(c.intro, locale)}</p>
    <div className="architecture-tabs recovery-categories" role="group" aria-label={tr(rollbackCopy.title, locale)}>
      {recoveryGroups.map((item, index) => <button key={item.id} aria-pressed={item.id === groupId} onClick={() => { setGroupId(item.id); selectRoute(item.routes[0].id); }}>{String(index + 1).padStart(2, '0')} / {tr(item.title, locale)}</button>)}
    </div>
    <div className="architecture-tabs recovery-cases" role="group" aria-label={tr(c.choose, locale)}>
      {group.routes.map(item => <button key={item.id} aria-pressed={item.id === routeId} onClick={() => selectRoute(item.id)}>{tr(item.title, locale)}</button>)}
    </div>
    <p className="recovery-summary">{tr(route.summary, locale)}</p>
    <div className="architecture-map-heading"><div className="architecture-legend"><span>━ {tr(c.control, locale)}</span><span>┄ {tr(c.idle, locale)}</span></div></div>
    <div className="architecture-tabs recovery-outcome" role="group" aria-label={tr(c.traffic, locale)}>
      <button aria-pressed={!recovered} onClick={() => { setRecovered(false); setSelection('router'); }}>{tr(c.before, locale)}</button>
      <button aria-pressed={recovered} onClick={() => { setRecovered(true); setSelection('router'); }}>{tr(c.after, locale)}</button>
    </div>
    <ConnectionMap key={route.id} nodes={nodes} edges={edges} locale={locale} selected={selected.id} onSelect={setSelection} delivery={false} recovery note={route.tiles.length <= 4 ? tr(recovered ? route.after : route.before, locale) : undefined}/>
    <div className={`architecture-story ${selected.kind ?? ''}`} id="architecture-node-story"><span className="architecture-story-index">{String(nodes.indexOf(selected) + 1).padStart(2, '0')} / {nodes.length}</span><div><h3>{selected.title}</h3><p>{tr(selected.detail, locale)}</p></div></div>
    <div className="architecture-foundations recovery-results" aria-live="polite">
      <article><h3>{tr(recovered ? c.after : c.before, locale)}</h3><p>{tr(recovered ? route.after : route.before, locale)}</p></article>
      <article><h3>{tr(c.implementation, locale)}</h3><p>{tr(route.boundary, locale)}</p></article>
    </div>
    <details className="recovery-hazards"><summary>{tr(c.hazards, locale)}</summary><p>{tr(recoveryGuideCopy.scope, locale)}</p><div className="architecture-foundations">{releaseHazards.map(item => <article key={item.title}><h3>{item.title}</h3><p>{tr(item.risk, locale)}</p><p>{tr(item.response, locale)}</p></article>)}</div></details>
  </section>;
}
