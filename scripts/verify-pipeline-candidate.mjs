import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export function listFiles(directory, prefix = '') {
  return readdirSync(directory).sort().flatMap(name => {
    const path = join(directory, name);
    const stat = lstatSync(path);
    assert.ok(!stat.isSymbolicLink(), 'Candidate must not contain symbolic links');
    return stat.isDirectory() ? listFiles(path, `${prefix}${name}/`) : [`${prefix}${name}`];
  });
}
export function safePath(path) {
  assert.ok(typeof path === 'string' && /^[A-Za-z0-9_./-]+$/.test(path) && !path.startsWith('/') && path.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe candidate path');
  return path;
}
export function verifyCandidate(directory) {
  const actualFiles = listFiles(directory);
  const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.kind, 'pipeline-release-candidate');
  assert.equal(manifest.sourceDirty, false);
  assert.match(manifest.gitCommit, /^[a-f0-9]{40}$/);
  assert.match(manifest.releaseId, /^[a-f0-9]{64}$/);
  assert.equal(manifest.backend.path, 'backend.zip');
  assert.ok(Array.isArray(manifest.frontend) && manifest.frontend.length >= 2);
  const entries = [manifest.backend, ...manifest.frontend.map(file => ({ ...file, path: `frontend/${safePath(file.path)}` }))];
  const paths = entries.map(file => safePath(file.path));
  assert.equal(new Set(paths).size, paths.length, 'Duplicate manifest path');
  for (const file of entries) {
    assert.match(file.sha256, /^[a-f0-9]{64}$/);
    assert.equal(digest(readFileSync(join(directory, file.path))), file.sha256, `Checksum mismatch: ${file.path}`);
  }
  assert.deepEqual(actualFiles, [...paths, 'manifest.json', 'SHA256SUMS'].sort(), 'Candidate contains missing or unlisted files');
  const identity = digest(JSON.stringify({ gitCommit: manifest.gitCommit, backendSha256: manifest.backend.sha256 }));
  assert.equal(manifest.releaseId, identity, 'Release identity does not match source and backend');
  const version = JSON.parse(readFileSync(join(directory, 'frontend/version.json'), 'utf8'));
  assert.deepEqual(version, { releaseId: identity, gitCommit: manifest.gitCommit, sourceDirty: false });
  assert.ok(readFileSync(join(directory, 'frontend/index.html'), 'utf8').includes(`/releases/${identity}/assets/`), 'Frontend must use the candidate asset prefix');
  const sums = [...paths, 'manifest.json'].sort().map(path => `${digest(readFileSync(join(directory, path)))}  ${path}\n`).join('');
  assert.equal(readFileSync(join(directory, 'SHA256SUMS'), 'utf8'), sums, 'Checksum index does not match candidate');
  return manifest;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const manifest = verifyCandidate(resolve(process.argv[2] || '.local/pipeline-candidate'));
  console.log(`Candidate verified: ${manifest.releaseId}; source=${manifest.gitCommit}. No deployment performed.`);
}
