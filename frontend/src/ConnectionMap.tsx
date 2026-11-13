import { useId } from 'react';
import type { Locale } from './i18n';
import { architectureCopy as c, tr, type ArchitectureNode, type Edge } from './architectureData';

export function ConnectionMap({ nodes, edges, locale, selected, onSelect, delivery, recovery = false, note }: { nodes: ArchitectureNode[]; edges: Edge[]; locale: Locale; selected: string; onSelect: (id: string) => void; delivery: boolean; recovery?: boolean; note?: string }) {
  const marker = useId().replace(/:/g, '');
  return <div className="architecture-map-scroll" tabIndex={0} role="region" aria-label={tr(recovery ? c.recovery : delivery ? c.delivery : c.runtime, locale)}>
    <div className={`architecture-canvas ${delivery ? 'delivery-canvas' : ''}`}>
      {!delivery && !recovery && <div className="aws-boundary"><span>AWS / TOKYO · ap-northeast-1 <small>ACM → us-east-1</small></span></div>}
      {recovery && <><span className="recovery-map-label control">{tr(['検知 → 判断 → 復旧操作', '检测 → 判断 → 恢复操作', 'Detect → decide → recover'], locale)}</span><span className="recovery-map-label traffic">{tr(['本番リクエスト', '生产请求', 'Production requests'], locale)}</span></>}
      <svg className="architecture-wires" viewBox="0 0 1070 620" aria-hidden="true">
        <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="currentColor" strokeWidth="2"/></marker></defs>
        {edges.map(edge => <g key={`${edge.from}-${edge.to}`} className={`${!edge.inactive && (edge.from === selected || edge.to === selected) ? 'wire-active' : ''} ${edge.dashed ? 'wire-planned' : ''} ${edge.inactive ? 'wire-inactive' : ''}`}>
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
      {recovery && note && <div className="delivery-map-note recovery-map-note"><span>PRODUCTION ROUTING</span><p>{note}</p></div>}
    </div>
  </div>;
}

