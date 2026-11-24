import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkLinks, localLinks } from './check-docs.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const guidePath = 'docs/learning/maintenance-guide.md';
const read = path => readFileSync(resolve(root, path), 'utf8');
const guide = read(guidePath);

test('beginner and course entrances reach the guide, with one inventory row per new file', () => {
  for (const page of ['docs/learning/start-here.md', 'docs/learning/README.md']) {
    const links = localLinks(read(page)).map(link => link.href);
    assert.ok(links.includes('maintenance-guide.md'), `${page} must link to maintenance guide`);
  }
  const inventory = read('docs/learning/file-map-inventory.md');
  for (const path of [guidePath, 'scripts/checks/test-maintenance-guide.mjs']) {
    assert.equal(inventory.split(/\r?\n/).filter(line => line.startsWith(`| \`${path}\` |`)).length, 1, `${path} needs exactly one row`);
  }
});

test('every guide link resolves and the project-owned entry points are directly reachable', () => {
  assert.deepEqual(checkLinks(root, guidePath, guide), []);
  const links = localLinks(guide).map(link => link.href);
  for (const path of [
    '../../AGENTS.md', '../../aidlc/spaces/default/memory/project.md',
    '../../.agents/skills/portfolio-story/SKILL.md', '../stories/template.md',
    'README.md', '../deployment/README.md',
  ]) assert.ok(links.includes(path), `missing direct link: ${path}`);
});

test('change examples identify scope, check and impact across the requested destinations', () => {
  const table = guide.split('## 先看这张选择表')[1]?.split('## AI-DLC 的规则为什么分层')[0];
  assert.ok(table, 'change-selection table missing');
  for (const header of ['想改什么', '适用范围', '改后怎么检查', '可能影响']) assert.ok(table.includes(header), `missing ${header}`);
  const rows = table.split(/\r?\n/).filter(line => line.startsWith('| ') && !line.includes('---'));
  assert.ok(rows.length >= 8, 'need a header and examples for rules, method, skills, Story, learning and deployment');
  for (const row of rows) assert.equal(row.split('|').length, 6, `table row must have four populated cells: ${row}`);
  for (const path of ['AGENTS.md', 'memory/project.md', 'memory/phases/', 'portfolio-story/SKILL.md', 'stories/template.md', 'file-map-inventory.md', 'deployment/README.md']) {
    assert.ok(table.includes(path), `missing change destination: ${path}`);
  }
});

test('method-layer explanation matches the active memory locations and additive rule', () => {
  const memoryRoot = 'aidlc/spaces/default/memory';
  for (const path of ['org.md', 'team.md', 'project.md', 'phases/construction.md']) {
    assert.ok(existsSync(resolve(root, memoryRoot, path)), `missing active memory: ${path}`);
  }
  assert.match(read(`${memoryRoot}/team.md`), /Edit at the gate,\s*>\s*not directly/);
  assert.match(read(`${memoryRoot}/project.md`), /portfolio-story/);
  assert.match(guide, /org → team → project → phase → stage/);
  assert.match(guide, /叠加/);
  assert.match(guide, /实践确认/);
});

test('project workflow and framework-stage guidance keep generated state out of edit instructions', () => {
  const onboarding = read('.codex/onboarding.md');
  assert.match(onboarding, /Plugins under `plugins\/<name>\/`/);
  assert.match(onboarding, /stage-graph\.json/);
  assert.match(guide, /真正增加一个 AI-DLC 生命周期阶段/);
  assert.match(guide, /plugins\/<name>\//);
  for (const name of ['aidlc-state.md', 'stage-graph.json', '.codex/rules/default.rules']) assert.ok(guide.includes(name), `missing owned/generated boundary: ${name}`);
  assert.match(guide, /不能靠编辑这些记录/);
  assert.match(guide, /创建付费资源需明确授权/);
});
