import { useId, useState } from 'react';
import type { Locale } from './i18n';
import { architectureCopy as c, deliveryEdges, deliveryNodes, foundations, runtimeEdges, runtimeNodes, tr, type ArchitectureNode, type Edge } from './architectureData';
import './architecture.css';
import { RollbackLab } from './RollbackLab';

export function ArchitectureThumbnail({ locale }: { locale: Locale }) {
  return <span className="architecture-thumbnail" aria-hidden="true">
    <span className="thumbnail-caption">SYSTEM MAP / 01</span>
    <svg viewBox="0 0 300 190" fill="none"><path className="thumbnail-wire" d="M55 95H125M160 95H220V40H250M220 95V150H250"/>
      <rect x="18" y="76" width="60" height="40" rx="2"/><rect x="108" y="70" width="80" height="50" rx="2"/><rect x="227" y="20" width="60" height="40" rx="2"/><rect x="227" y="130" width="60" height="40" rx="2"/>
      <g className="thumbnail-labels"><text x="48" y="101">WEB</text><text x="148" y="100">CDN</text><text x="257" y="45">S3</text><text x="257" y="155">API</text></g>
      <path className="thumbnail-signal" d="M78 95H108M188 95H215V150H227"/>
    </svg><span className="thumbnail-bubble">{tr(c.bubble, locale)}</span><span className="thumbnail-footer">REACT · JAVA · AWS <b>↗</b></span>
  </span>;
}

function ConnectionMap({ nodes, edges, locale, selected, onSelect, delivery }: { nodes: ArchitectureNode[]; edges: Edge[]; locale: Locale; selected: string; onSelect: (id: string) => void; delivery: boolean }) {
  const marker = useId().replace(/:/g, '');
  return <div className="architecture-map-scroll" tabIndex={0} role="region" aria-label={tr(delivery ? c.delivery : c.runtime, locale)}>
    <div className={`architecture-canvas ${delivery ? 'delivery-canvas' : ''}`}>
      {!delivery && <div className="aws-boundary"><span>AWS / TOKYO · ap-northeast-1 <small>ACM → us-east-1</small></span></div>}
      <svg className="architecture-wires" viewBox="0 0 1070 620" aria-hidden="true">
        <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="currentColor" strokeWidth="2"/></marker></defs>
        {edges.map(edge => <g key={`${edge.from}-${edge.to}`} className={`${edge.from === selected || edge.to === selected ? 'wire-active' : ''} ${edge.dashed ? 'wire-planned' : ''}`}>
          <path d={edge.path} markerEnd={`url(#${marker})`}/>{edge.label && <text x={edge.x} y={edge.y}>{edge.label}</text>}
        </g>)}
      </svg>
      {nodes.map(node => <button key={node.id} className={`architecture-node ${node.kind ?? ''} ${node.id === selected ? 'is-selected' : ''}`} style={{ left: node.x, top: node.y }} aria-pressed={node.id === selected} aria-controls="architecture-node-story" onMouseEnter={() => onSelect(node.id)} onFocus={() => onSelect(node.id)} onClick={() => onSelect(node.id)}>
        <span className="node-corner" aria-hidden="true">{node.kind === 'gate' ? '◇' : node.kind === 'planned' ? '…' : node.kind === 'alternative' ? '⑂' : '▪'}</span>
        <strong>{node.title}</strong><span>{tr(node.sub, locale)}</span>
        {node.kind && node.kind !== 'gate' && <small>{tr(node.kind === 'planned' ? c.planned : c.alternative, locale)}</small>}
        <span aria-hidden="true" className={`node-tooltip ${node.y >= 275 ? 'tooltip-above' : ''} ${node.x > 760 ? 'tooltip-right' : ''}`}>{tr(node.detail, locale)}</span>
      </button>)}
      {delivery && <div className="delivery-map-note"><span>ONE SHA · ONE CANDIDATE</span><p>{tr(['同じ成果物を STG → Green → 本番へ。承認は各実行ごとに 2 回。', '同一制品依次进入 STG → Green → 生产，每次执行都需两道新审批。', 'The same artifacts move through STG → Green → production. Two new approvals for every execution.'], locale)}</p></div>}
    </div>
  </div>;
}

function CanaryDemo({ locale }: { locale: Locale }) {
  const [stage, setStage] = useState(0);
  const green = stage === 1 ? 10 : stage === 2 ? 100 : 0;
  return <section className={`canary-demo canary-stage-${stage}`} aria-labelledby="canary-title">
    <div><p className="architecture-eyebrow">INTERACTIVE / CODEDEPLOY</p><h3 id="canary-title">{tr(c.demo, locale)}</h3><p>{tr(c.demoNote, locale)}</p></div>
    <div className="canary-flow"><span className="canary-alias">API → live</span><span className="canary-branch" aria-hidden="true"/><div className="canary-versions">
      <div className="canary-version blue"><span>Blue <b>{100 - green}%</b></span><div className="traffic-track"><i style={{ width: `${100 - green}%` }}/></div></div>
      <div className="canary-version green"><span>Green <b>{green}%</b></span><div className="traffic-track"><i style={{ width: `${green}%` }}/></div></div>
    </div></div>
    <p className="canary-status" role="status">{tr(c.stages[stage], locale)}</p>
    <p className="architecture-fineprint">{tr(c.weightNote, locale)}</p>
    <div className="canary-controls"><button disabled={stage !== 0} onClick={() => setStage(1)}>{tr(c.start, locale)}</button><button disabled={stage !== 1} onClick={() => setStage(2)}>{tr(c.promote, locale)}</button><button disabled={stage !== 1} onClick={() => setStage(3)}>{tr(c.rollback, locale)}</button><button onClick={() => setStage(0)}>{tr(c.reset, locale)} ↺</button></div>
    <p className="architecture-fineprint">{tr(c.boundary, locale)}</p>
  </section>;
}

export function ArchitectureExplorer({ locale }: { locale: Locale }) {
  const [view, setView] = useState<'runtime' | 'delivery' | 'rollback'>('runtime');
  const [selection, setSelection] = useState({ runtime: 'cdn', delivery: 'source' });
  const nodes = view === 'runtime' ? runtimeNodes : deliveryNodes;
  const selected = nodes.find(node => node.id === selection[view === 'rollback' ? 'runtime' : view])!;
  return <div className="architecture-explorer">
    <p className="architecture-intro">{tr(c.intro, locale)}</p>
    <div className="architecture-toolbar"><div className="architecture-tabs" role="group" aria-label={tr(c.map, locale)}>{(['runtime', 'delivery', 'rollback'] as const).map(tab => <button key={tab} aria-pressed={view === tab} onClick={() => setView(tab)}>{tr(tab === 'rollback' ? c.recovery : c[tab], locale)}</button>)}</div><span className="architecture-stamp">LIVE ON AWS</span></div>
    {view === 'rollback' ? <RollbackLab locale={locale}/> : <>
    <div className="architecture-map-heading"><p>{tr(c.hint, locale)}</p><div className="architecture-legend"><span>━ {tr(c.live, locale)}</span><span>┄ {tr(c.planned, locale)}</span><span>┄ {tr(c.alternative, locale)}</span></div></div>
    <ConnectionMap key={view} nodes={nodes} edges={view === 'runtime' ? runtimeEdges : deliveryEdges} locale={locale} selected={selected.id} onSelect={id => setSelection(old => ({ ...old, [view]: id }))} delivery={view === 'delivery'}/>
    <div className={`architecture-story ${selected.kind ?? ''}`} id="architecture-node-story"><span className="architecture-story-index">{String(nodes.indexOf(selected) + 1).padStart(2, '0')} / {nodes.length}</span><div><h3>{selected.title}</h3><p>{tr(selected.detail, locale)}</p></div></div>
    {view === 'delivery' ? <CanaryDemo locale={locale}/> : <>
      <section className="architecture-foundations" aria-label={tr(c.foundation, locale)}>{foundations.map(item => <article key={item.title}><h3>{item.title}</h3><p>{tr(item.body, locale)}</p></article>)}</section>
      <section className="architecture-costs"><p className="architecture-eyebrow">DESIGN DECISION / 01</p><h3>{tr(c.costs, locale)}</h3><p>{tr(c.costIntro, locale)}</p><p className="cost-unit">{tr(c.costUnit, locale)}</p><div className="cost-comparison"><article><span className="cost-status">{tr(c.live, locale)}</span><h4>Lambda + HTTP API</h4><strong>≈ $0.18 <small>USD</small></strong><p>{tr(c.lambdaCost, locale)}</p></article><article><span className="cost-status">{tr(c.alternative, locale)}</span><h4>ECS Fargate + ALB</h4><strong>≈ $51–57 <small>USD</small></strong><p>{tr(c.ecsCost, locale)}</p></article></div><p className="architecture-fineprint">{tr(c.costNote, locale)}</p><div className="cost-sources">AWS PRICING ↗ {[
        ['Lambda', 'https://aws.amazon.com/lambda/pricing/'], ['HTTP API', 'https://aws.amazon.com/api-gateway/pricing/'], ['Fargate · Tokyo', 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonECS/current/ap-northeast-1/index.json'], ['ALB · Tokyo', 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSELB/current/ap-northeast-1/index.json'], ['IPv4', 'https://aws.amazon.com/vpc/pricing/'],
      ].map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer">{label}</a>)}</div></section>
    </>}
    </>}
  </div>;
}
