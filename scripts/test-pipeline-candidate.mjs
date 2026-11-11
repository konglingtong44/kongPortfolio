import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { digest, listFiles, verifyCandidate } from './verify-pipeline-candidate.mjs';

const local = resolve('.local');
mkdirSync(local, { recursive: true });
function fixture() {
  const directory = mkdtempSync(join(local, 'candidate-test-'));
  const gitCommit = 'a'.repeat(40);
  const zip = Buffer.from('Synthetic manifest fixture, not a Lambda ZIP');
  const releaseId = digest(JSON.stringify({ gitCommit, backendSha256: digest(zip) }));
  mkdirSync(join(directory, 'frontend'));
  writeFileSync(join(directory, 'backend.zip'), zip);
  writeFileSync(join(directory, 'frontend/index.html'), `<script src="/releases/${releaseId}/assets/app.js"></script>`);
  writeFileSync(join(directory, 'frontend/version.json'), JSON.stringify({ releaseId, gitCommit, sourceDirty: false }));
  const manifest = { schemaVersion: 2, kind: 'pipeline-release-candidate', gitCommit, releaseId, sourceDirty: false, backend: { path: 'backend.zip', sha256: digest(zip) }, frontend: ['index.html', 'version.json'].map(path => ({ path, sha256: digest(readFileSync(join(directory, 'frontend', path))) })) };
  writeFileSync(join(directory, 'manifest.json'), JSON.stringify(manifest));
  writeFileSync(join(directory, 'SHA256SUMS'), listFiles(directory).map(path => `${digest(readFileSync(join(directory, path)))}  ${path}\n`).join(''));
  return { directory, manifest };
}
assert.equal(verifyCandidate(fixture().directory).sourceDirty, false);
{
  const { directory } = fixture();
  writeFileSync(join(directory, 'backend.zip'), 'tampered');
  assert.throws(() => verifyCandidate(directory), /Checksum mismatch/);
}
{
  const { directory, manifest } = fixture();
  manifest.frontend[0].path = '../../outside';
  writeFileSync(join(directory, 'manifest.json'), JSON.stringify(manifest));
  assert.throws(() => verifyCandidate(directory), /Unsafe candidate path/);
}
{
  const { directory, manifest } = fixture();
  manifest.frontend.push(manifest.frontend[0]);
  writeFileSync(join(directory, 'manifest.json'), JSON.stringify(manifest));
  assert.throws(() => verifyCandidate(directory), /Duplicate/);
}
{
  const { directory } = fixture();
  writeFileSync(join(directory, 'unlisted.txt'), 'unexpected');
  assert.throws(() => verifyCandidate(directory), /unlisted/);
}
console.log('Candidate integrity: valid manifest accepted; tampered ZIP, traversal, duplicate and unlisted files rejected. Fixtures do not verify ZIP runtime.');
