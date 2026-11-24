import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkLinks, localLinks } from './check-docs.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = path => readFileSync(resolve(root, path), 'utf8');
const aiReadmePath = 'docs/ai/README.md';
const guidePath = 'docs/ai/aidlc-codex.md';
const proposalPath = 'docs/learning/cleanup-proposal.md';
const intentHref = '../../aidlc/spaces/default/intents/261117-docs-learning-restructur/aidlc-state.md';
const aiReadme = read(aiReadmePath);
const guide = read(guidePath);
const proposal = read(proposalPath);

test('AI topic entry dates the original setup result rather than presenting it as live status', () => {
  assert.match(aiReadme, /2026-11-17 的接入核对结果/);
  assert.match(aiReadme, /截至该日/);
  assert.match(aiReadme, /不是今天的运行状态/);
  assert.ok(!aiReadme.includes('首次模型驱动的完整Story及hook执行健康仍待验证'));
});

test('Codex guide labels the setup and next-Story plan as 2026-11-17 history', () => {
  assert.match(guide, /## 2026-11-17 的接入核对/);
  assert.match(guide, /## 2026-11-17 时记录的下一步计划/);
  assert.match(guide, /当时计划下一Story/);
  assert.ok(!guide.includes('## 当前接入状态'));
});

test('both entries reach this intent record through valid relative links', () => {
  for (const [path, content] of [[aiReadmePath, aiReadme], [guidePath, guide]]) {
    assert.ok(localLinks(content).some(link => link.href === intentHref), `missing intent link: ${path}`);
    assert.deepEqual(checkLinks(root, path, content), [], `broken local links: ${path}`);
  }
});

test('historical setup counts and launch commands survive the wording correction', () => {
  for (const fact of ['AI-DLC 2.11.4', '0.169.0-alpha.11.1', '11项hook信任', '65通过、2警告、0失败']) {
    assert.ok(guide.includes(fact), `missing historical fact: ${fact}`);
  }
  for (const command of ['-Action Preview', '-Action Doctor', '-Action Launch']) {
    assert.ok(guide.includes(command), `missing historical command: ${command}`);
  }
});

test('execution record remains limited to two wording edits and inventory includes this regression', () => {
  const execution = proposal.split('## U6 执行记录（2026-11-24）')[1];
  assert.ok(execution, 'missing U6 execution record');
  assert.match(execution, /首批两个文件/);
  assert.match(execution, /没有批准或实施这些操作/);
  assert.match(execution, /4 项保留与 1 项待核实/);
  const changedRows = proposal.split('\n').filter(line => line.startsWith('| `docs/ai/') && line.includes('完成可逆文字修正'));
  assert.equal(changedRows.length, 2);
  assert.ok(changedRows.some(line => line.startsWith('| `docs/ai/README.md`')));
  assert.ok(changedRows.some(line => line.startsWith('| `docs/ai/aidlc-codex.md`')));
  const inventory = read('docs/learning/file-map-inventory.md');
  assert.ok(inventory.includes('| `scripts/checks/test-approved-cleanup.mjs` |'));
  assert.deepEqual(checkLinks(root, proposalPath, proposal), []);
});
