import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkLinks, localLinks } from './check-docs.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const entryPath = 'docs/learning/start-here.md';
const entry = readFileSync(resolve(root, entryPath), 'utf8');

function hrefs(path) {
  return localLinks(readFileSync(resolve(root, path), 'utf8')).map(link => link.href);
}

test('zero-background entry has resolvable local destinations', () => {
  assert.ok(localLinks(entry).length >= 10, 'entry should offer a usable reading route');
  assert.deepEqual(checkLinks(root, entryPath, entry), []);
});

test('both documentation landing pages lead to the beginner entry', () => {
  assert.ok(hrefs('docs/README.md').includes('learning/start-here.md'));
  assert.ok(hrefs('docs/learning/README.md').includes('start-here.md'));
});

test('entry links every required topic to an existing page', () => {
  for (const path of [
    '../architecture/overview.md', '../ai/README.md',
    '../../AGENTS.md', '../../aidlc/spaces/default/memory/project.md',
    'README.md', '01-local.md',
  ]) {
    assert.ok(localLinks(entry).some(link => link.href === path), `missing route: ${path}`);
  }
});

test('initial folder map covers every major maintained area', () => {
  for (const path of [
    'frontend', 'backend', 'infra', 'scripts', 'docs',
    'aidlc', 'codebuild', '.agents/skills',
  ]) {
    assert.ok(existsSync(resolve(root, path)), `source folder missing: ${path}`);
    assert.ok(localLinks(entry).some(link =>
      resolve(root, 'docs/learning', link.href.split('#', 1)[0]) === resolve(root, path)
    ), `folder missing from entry: ${path}`);
  }
});

test('entry separates historical evidence from live AWS status', () => {
  assert.match(entry, /历史发布记录.*只证明记录当时的结果/);
  assert.match(entry, /本次整理没有查询实时 AWS 状态/);
  assert.match(entry, /没有部署、调用付费模型或验证手机真机/);
});
