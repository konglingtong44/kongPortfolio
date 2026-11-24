import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkLinks, localLinks } from './check-docs.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const inventoryPath = 'docs/learning/file-map-inventory.md';
const inventory = readFileSync(resolve(root, inventoryPath), 'utf8');
const rows = [...inventory.matchAll(/^\| `([^`]+)` \|/gm)].map(match => match[1]);
const listed = new Set(rows);

function isAuthoredProjectPath(path) {
  return !/^(?:aidlc\/|\.codex\/|\.agents\/skills\/aidlc(?:-|\/)|outputs\/|\.aidlc-version$)/.test(path)
    && path !== 'frontend/package-lock.json' && !path.endsWith('/.terraform.lock.hcl');
}

function visibleProjectPaths() {
  const git = spawnSync('git', ['-c', 'core.quotepath=false', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
  });
  assert.equal(git.status, 0, git.stderr || git.error?.message || 'Git file listing failed');
  return new Set(git.stdout.split('\0').filter(Boolean).map(path => path.replaceAll('\\', '/')).filter(isAuthoredProjectPath));
}

test('every Git-visible project-authored file has exactly one inventory row', () => {
  assert.equal(rows.length, listed.size, 'duplicate paths in inventory');
  assert.deepEqual([...listed].sort(), [...visibleProjectPaths()].sort());
});

test('all listed paths exist inside the repository', () => {
  for (const path of listed) {
    assert.ok(!path.includes('..') && !path.startsWith('/'), `unsafe inventory path: ${path}`);
    assert.ok(existsSync(resolve(root, path)), `missing inventory path: ${path}`);
  }
});

test('generated and private categories stay outside the authored-file rows', () => {
  for (const path of listed) assert.ok(isAuthoredProjectPath(path), `generated path listed as authored: ${path}`);
  assert.ok(!listed.has('.env'));
  assert.match(inventory, /package-lock\.json/);
  assert.match(inventory, /\.terraform\.lock\.hcl/);
});

test('the beginner route and course directory both link to the file map', () => {
  for (const page of ['docs/learning/start-here.md', 'docs/learning/README.md']) {
    const links = localLinks(readFileSync(resolve(root, page), 'utf8')).map(link => link.href);
    assert.ok(links.includes('file-map.md'), `${page} lacks folder map link`);
    assert.ok(links.includes('file-map-inventory.md'), `${page} lacks inventory link`);
  }
});

test('both map pages have resolvable local links', () => {
  for (const page of ['docs/learning/file-map.md', inventoryPath]) {
    assert.deepEqual(checkLinks(root, page, readFileSync(resolve(root, page), 'utf8')), [], page);
  }
});
