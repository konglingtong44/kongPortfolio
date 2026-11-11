import { useEffect, useRef, useState } from 'react';
import type { Locale } from './i18n';
import { modulesCopy } from './modules';

export const emailPattern = '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$';
type Node = { kind: 'token'; text: string } | { kind: 'seq' | 'alt'; children: Node[] } | { kind: 'repeat'; child: Node; label: string; optional: boolean };
export function parsePattern(pattern: string): Node {
  let i = 0;
  function expression(): Node {
    const branches: Node[] = [sequence()];
    while (pattern[i] === '|') { i++; branches.push(sequence()); }
    return branches.length === 1 ? branches[0] : { kind: 'alt', children: branches };
  }
  function sequence(): Node {
    const children: Node[] = [];
    while (i < pattern.length && !['|', ')'].includes(pattern[i])) {
      let node: Node;
      const c = pattern[i++];
      if (c === '(') {
        if (pattern.slice(i, i + 2) === '?:') i += 2;
        else if (pattern[i] === '?') throw Error('Unsupported group');
        node = expression();
        if (pattern[i++] !== ')') throw Error('Unclosed group');
      } else if (c === '[') {
        let value = c; let closed = false;
        while (i < pattern.length) { const next = pattern[i++]; value += next; if (next === '\\') value += pattern[i++] ?? ''; else if (next === ']') { closed = true; break; } }
        if (!closed) throw Error('Unclosed class');
        node = { kind: 'token', text: value };
      } else if (c === '\\') {
        const next = pattern[i++];
        if (!next || /[1-9pkPu]/.test(next)) throw Error('Unsupported escape');
        node = { kind: 'token', text: `\\${next}` };
      } else {
        if ('*+?{}'.includes(c)) throw Error('Unexpected quantifier');
        node = { kind: 'token', text: c };
      }
      const q = pattern[i];
      if (q && '*+?{'.includes(q)) {
        let label = pattern[i++];
        if (q === '{') { while (i < pattern.length && pattern[i] !== '}') label += pattern[i++]; if (pattern[i++] !== '}') throw Error('Quantifier'); label += '}'; if (!/^\{\d+(,\d*)?\}$/.test(label)) throw Error('Quantifier'); }
        if (pattern[i] === '?') { i++; label += '?'; }
        node = { kind: 'repeat', child: node, label, optional: q === '*' || q === '?' || /^\{0[,}]/.test(label) };
      }
      children.push(node);
    }
    return { kind: 'seq', children };
  }
  const result = expression();
  if (i !== pattern.length || pattern.length > 300) throw Error('Unsupported');
  return result;
}
type Layout = { width: number; height: number; draw: (x: number, y: number, key: string) => React.ReactNode };
function layout(node: Node): Layout {
  if (node.kind === 'token') {
    const width = Math.max(65, node.text.length * 9 + 28);
    return { width, height: 44, draw: (x, y, key) => <g key={key}><rect x={x} y={y - 19} width={width} height={38} rx={9}/><text x={x + width / 2} y={y + 5}>{node.text}</text></g> };
  }
  if (node.kind === 'repeat') {
    const inner = layout(node.child), width = inner.width + 48, height = inner.height + 70;
    return { width, height, draw: (x, y, key) => <g key={key}><path d={`M${x},${y} H${x + 24} M${x + width - 24},${y} H${x + width}`}/>{inner.draw(x + 24, y, key + 'r')}{node.label[0] !== '?' && <><path className="loop" d={`M${x + width - 12},${y} V${y + inner.height / 2 + 22} H${x + 12} V${y} l-4,6 m4,-6 l4,6`}/><text className="quantifier" x={x + width / 2} y={y + inner.height / 2 + 17}>{node.label}</text></>}{node.optional && <path d={`M${x + 6},${y} V${y - inner.height / 2 - 20} H${x + width - 6} V${y}`}/>}</g> };
  }
  const children = node.children.map(layout);
  if (node.kind === 'alt') {
    const width = Math.max(...children.map(c => c.width)) + 60, height = children.reduce((sum, c) => sum + c.height + 20, 0);
    return { width, height, draw: (x, y, key) => { let top = y - height / 2; return <g key={key}>{children.map((c, index) => { const cy = top + c.height / 2 + 10; top += c.height + 20; return <g key={index}><path d={`M${x},${y} H${x + 15} V${cy} H${x + 30} M${x + 30 + c.width},${cy} H${x + width - 15} V${y} H${x + width}`}/>{c.draw(x + 30, cy, `${key}${index}`)}</g>; })}</g>; } };
  }
  const width = children.length ? children.reduce((sum, c) => sum + c.width, 0) + (children.length - 1) * 25 : 25;
  return { width, height: Math.max(44, ...children.map(c => c.height)), draw: (x, y, key) => { let left = x; return <g key={key}>{children.length ? children.map((c, index) => { const cx = left; left += c.width + 25; return <g key={index}>{index > 0 && <path d={`M${cx - 25},${y} H${cx}`}/ >}{c.draw(cx, y, `${key}${index}`)}</g>; }) : <path d={`M${x},${y} h25`}/>}</g>; } };
}
export function RegexLab({ locale }: { locale: Locale }) {
  const t = modulesCopy[locale];
  const [pattern, setPattern] = useState(emailPattern), [sample, setSample] = useState('hello@example.com');
  const [result, setResult] = useState<keyof typeof t | null>(null);
  const worker = useRef<Worker | null>(null), timer = useRef<number | undefined>(undefined);
  function cancel() { worker.current?.terminate(); worker.current = null; clearTimeout(timer.current); }
  useEffect(() => () => cancel(), []);
  function changePattern(value: string) { cancel(); setPattern(value); setResult(null); }
  function test() {
    cancel(); setResult('testing');
    const blob = new Blob(['onmessage = e => { try { postMessage(new RegExp(e.data.pattern).test(e.data.sample) ? "match" : "noMatch") } catch { postMessage("invalid") } }'], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    try {
      worker.current = new Worker(url);
      worker.current.onmessage = e => { setResult(e.data); cancel(); };
      worker.current.onerror = () => { setResult('invalid'); cancel(); };
      worker.current.postMessage({ pattern, sample });
      timer.current = window.setTimeout(() => { cancel(); setResult('timeout'); }, 800);
    } catch { setResult('invalid'); } finally { URL.revokeObjectURL(url); }
  }
  let diagram: Layout | null = null;
  try { new RegExp(pattern); diagram = layout(parsePattern(pattern)); } catch { /* Unsupported syntax remains testable in an isolated worker. */ }
  return <div className="regex-lab"><label htmlFor="pattern">{t.pattern}<span>JavaScript · /pattern/</span></label><input id="pattern" value={pattern} maxLength={300} onChange={e => changePattern(e.target.value)}/><button className="subtle-button" onClick={() => changePattern(emailPattern)}>{t.reset} ↺</button><div className="railroad">{diagram ? <svg role="img" aria-label={t.regex + ' ' + pattern} viewBox={`0 0 ${diagram.width + 70} ${diagram.height + 50}`} style={{ minWidth: Math.min(diagram.width + 70, 1200) }}><circle cx={12} cy={(diagram.height + 50) / 2} r={5}/><path d={`M17,${(diagram.height + 50) / 2} H35 M${diagram.width + 35},${(diagram.height + 50) / 2} h20`}/>{diagram.draw(35, (diagram.height + 50) / 2, 'root')}<circle cx={diagram.width + 60} cy={(diagram.height + 50) / 2} r={5}/></svg> : <p>{t.unsupported}</p>}</div><p className="regex-hint">{t.start} → {t.end} · + = 1…n · * = 0…n · ? = 0…1 · {'{2,} = 2…n'}</p><label htmlFor="sample">{t.sample}</label><input id="sample" value={sample} maxLength={4000} onChange={e => { cancel(); setSample(e.target.value); setResult(null); }}/><div className="test-row"><button className="primary-button" onClick={test}>{t.test} ↗</button><output aria-live="polite" className={result === 'match' ? 'success' : ''}>{result && t[result]}</output></div></div>;
}
