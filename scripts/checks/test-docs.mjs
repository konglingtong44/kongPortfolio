import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { checkLinks, localLinks } from './check-docs.mjs';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = mkdtempSync(join(tmpdir(), 'kongportfolio-docs-'));
mkdirSync(join(root, 'docs'));
writeFileSync(join(root, 'README.md'), '# Root\n');
writeFileSync(join(root, 'docs', '日本語 sample.md'), '# Sample\n');
after(() => {
  unlinkSync(join(root, 'docs', '日本語 sample.md'));
  unlinkSync(join(root, 'README.md'));
  rmdirSync(join(root, 'docs'));
  rmdirSync(root);
});

test('resolves moved relative, repository-root, image and reference targets including Unicode and spaces', () => {
  const markdown = '[root](../README.md#start)\n[encoded](%E6%97%A5%E6%9C%AC%E8%AA%9E%20sample.md)\n![image](</docs/日本語 sample.md>)\n[ref]: ../README.md "Root"';
  assert.equal(localLinks(markdown).length, 4);
  assert.deepEqual(checkLinks(root, 'docs/intro.md', markdown), []);
});

test('ignores URLs, fragments, inline code and both styles of fenced code', () => {
  const markdown = '[site](https://example.com/) [mail](mailto:test@example.com) [anchor](#here)\n`[code](missing.md)`\n````md\n```\n[example](missing.md)\n````\n~~~md\n[example](missing.md)\n~~~';
  assert.deepEqual(localLinks(markdown), []);
});

test('reports the source line for a broken migration and detects a missing reference', () => {
  const failures = checkLinks(root, 'docs/intro.md', '# Intro\n\n[old](old/location.md)\n[ref]: missing.md');
  assert.deepEqual(failures.map(({ line, reason }) => ({ line, reason })), [
    { line: 3, reason: 'missing local target' }, { line: 4, reason: 'missing local target' },
  ]);
});

test('rejects paths outside the repository and malformed encodings', () => {
  const failures = checkLinks(root, 'docs/intro.md', '[escape](../../outside.md) [bad](bad%zz.md)');
  assert.deepEqual(failures.map(failure => failure.reason), ['target leaves repository', 'invalid URL encoding']);
});

test('both CLI entry points find root-level broken links from another cwd and preserve legacy exports', async () => {
  const filename = `.doc-check-${randomUUID()}.md`;
  // Resolve from the repository, not the checks directory.
  const repoFixture = fileURLToPath(new URL(`../../${filename}`, import.meta.url));
  writeFileSync(repoFixture, '[broken](missing-doc-check-target.md)');
  try {
    for (const entry of ['../check-docs.mjs', './check-docs.mjs']) {
      const script = fileURLToPath(new URL(entry, import.meta.url));
      const result = spawnSync(process.execPath, [script], { encoding: 'utf8', cwd: root });
      assert.equal(result.status, 1);
      assert.ok(result.stderr.includes(filename), 'CLI must scan the actual repository root');
      assert.ok(result.stderr.includes('missing-doc-check-target.md'));
    }
    const legacy = await import('../check-docs.mjs');
    assert.equal(legacy.checkLinks, checkLinks);
    assert.equal(legacy.localLinks, localLinks);
  } finally { unlinkSync(repoFixture); }
});
