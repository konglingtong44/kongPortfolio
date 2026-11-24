import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkLinks, localLinks } from './check-docs.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const proposalPath = 'docs/learning/cleanup-proposal.md';
const proposal = readFileSync(resolve(root, proposalPath), 'utf8');
const read = path => readFileSync(resolve(root, path), 'utf8');

function section(title) {
  const heading = `## ${title}`;
  const start = proposal.indexOf(heading);
  assert.ok(start >= 0, `missing section: ${heading}`);
  const next = proposal.indexOf('\n## ', start + heading.length);
  return proposal.slice(start, next < 0 ? undefined : next);
}

function candidateRows(title) {
  return [...section(title).matchAll(/^\| (`[^`]+`) \| (.+) \|$/gm)]
    .map(match => [match[1], ...match[2].split(' | ')]);
}

const categories = ['建议修正：可供 U6 首批审阅', '明确保留：相似内容服务不同目的', '待核实：暂不合并或移动'];

test('every candidate has a concrete path and all eight review fields', () => {
  for (const title of categories) {
    const table = section(title);
    assert.match(table, /\| 路径 \| 现有用途 \| 引用证据 \| 历史价值 \| 建议与影响 \| 验证 \| 回退 \| 审核状态 \|/);
    const rows = candidateRows(title);
    assert.ok(rows.length > 0, `empty category: ${title}`);
    for (const row of rows) {
      assert.equal(row.length, 8, `incomplete candidate: ${row[0]}`);
      for (const cell of row) assert.ok(cell.trim().length > 1, `empty review field: ${row[0]}`);
    }
  }
});

test('candidate paths are distinct existing project files, not generated or private state', () => {
  const paths = categories.flatMap(title => candidateRows(title).map(row => row[0].slice(1, -1)));
  assert.equal(paths.length, new Set(paths).size);
  for (const path of paths) {
    assert.match(path, /^(?:docs\/|\.agents\/skills\/portfolio-)[^\\]*$/);
    assert.ok(!path.includes('..') && !path.includes('/.terraform/'), `unsafe path: ${path}`);
    assert.ok(existsSync(resolve(root, path)), `missing candidate: ${path}`);
  }
});

test('the U6 first batch names only the two reviewed wording changes', () => {
  const batch = section('U6 第一小批的明确边界');
  const proposed = candidateRows(categories[0]).map(row => row[0].slice(1, -1)).sort();
  assert.deepEqual(proposed, ['docs/ai/README.md', 'docs/ai/aidlc-codex.md']);
  for (const path of proposed) assert.ok(batch.includes(`\`${path}\``));
  assert.match(batch, /逐文件批准/);
  assert.match(batch, /不做删改/);
  assert.match(batch, /不改 07\/13 章、Story、技能或代码/);
});

test('historical and project-specific sources stay in retain or uncertain groups', () => {
  const retained = candidateRows(categories[1]).map(row => row[0].slice(1, -1));
  const uncertain = candidateRows(categories[2]).map(row => row[0].slice(1, -1));
  for (const path of ['docs/learning/07-ai-workflow.md', 'docs/learning/13-aidlc-codex.md',
    'docs/stories/README.md', '.agents/skills/portfolio-story/SKILL.md']) {
    assert.ok(retained.includes(path), `missing retained file: ${path}`);
  }
  assert.ok(uncertain.includes('docs/ai/engineering-concepts.md'));
  assert.match(proposal, /AI-DLC 安装件/);
  assert.match(proposal, /Terraform State/);
});

test('learning navigation, authored-file inventory and proposal links are valid', () => {
  const links = localLinks(read('docs/learning/README.md')).map(link => link.href);
  assert.ok(links.includes('cleanup-proposal.md'));
  const inventory = read('docs/learning/file-map-inventory.md');
  for (const path of [proposalPath, 'scripts/checks/test-cleanup-proposal.mjs']) {
    assert.ok(inventory.includes(`| \`${path}\` |`), `missing inventory row: ${path}`);
  }
  assert.deepEqual(checkLinks(root, proposalPath, proposal), []);
});
