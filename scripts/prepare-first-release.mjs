// Local first-release candidate only. This prepares artifacts; it never calls AWS.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 120_000 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}
const gitCommit = run('git', ['rev-parse', 'HEAD']).trim();
const sourceDirty = run('git', ['status', '--porcelain']).trim().length > 0;
const sourcePaths = run('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', 'frontend', 'backend', 'scripts'])
  .split('\0').filter(Boolean).sort();
const sources = sourcePaths.map(path => ({ path, sha256: hash(readFileSync(join(root, path))) }));
const releaseId = hash(JSON.stringify(sources));
const releases = join(root, '.local/releases');
mkdirSync(releases, { recursive: true });
const destination = join(releases, releaseId);
assert.ok(!existsSync(destination), `Immutable candidate already exists: ${destination}. Reuse it; do not overwrite it.`);
assert.ok(existsSync(join(root, 'backend/target/kongPortfolio-lambda.zip')), 'Build and smoke-test Lambda first');

run(process.execPath, [join(root, 'frontend/node_modules/typescript/bin/tsc'), '-b'], join(root, 'frontend'));
run(process.execPath, [join(root, 'frontend/node_modules/vitest/vitest.mjs'), 'run'], join(root, 'frontend'));
run(process.execPath, [join(root, 'scripts/test-cloudfront-routing.mjs')]);
const temporary = mkdtempSync(join(releases, 'preparing-'));
const frontend = join(temporary, 'frontend');
run(process.execPath, [join(root, 'frontend/node_modules/vite/bin/vite.js'), 'build', `--base=/releases/${releaseId}/`, `--outDir=${frontend}`], join(root, 'frontend'));
writeFileSync(join(frontend, 'version.json'), JSON.stringify({ releaseId, gitCommit, sourceDirty }) + '\n');
copyFileSync(join(root, 'backend/target/kongPortfolio-lambda.zip'), join(temporary, 'backend.zip'));

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
const mime = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const fileManifest = files(frontend).sort().map(path => {
  const name = relative(frontend, path).replaceAll('\\', '/');
  const extension = name.slice(name.lastIndexOf('.'));
  assert.ok(mime[extension], `Add an explicit MIME type before publishing ${name}`);
  const text = ['.html', '.js', '.css'].includes(extension) ? readFileSync(path, 'utf8') : '';
  assert.ok(!/(?:["'(])\/(?:images|assets)\//.test(text), `Unversioned asset reference in ${name}`);
  return { path: name, sha256: hash(readFileSync(path)), contentType: mime[extension],
    cacheControl: ['index.html', 'version.json'].includes(name) ? 'no-cache,max-age=0,must-revalidate' : 'public,max-age=31536000,immutable' };
});
assert.ok(readFileSync(join(frontend, 'index.html'), 'utf8').includes(`/releases/${releaseId}/assets/`));
// Fail if an editor changed input while this build was running.
assert.ok(sources.every(source => hash(readFileSync(join(root, source.path))) === source.sha256), 'Source changed during build; discard the temporary candidate and retry.');
const manifest = { schemaVersion: 1, kind: 'first-release-candidate', releaseId, gitCommit, sourceDirty,
  backend: { path: 'backend.zip', sha256: hash(readFileSync(join(temporary, 'backend.zip'))) }, frontend: fileManifest, sources };
writeFileSync(join(temporary, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
renameSync(temporary, destination);
console.log(`First-release candidate: ${destination}`);
console.log(`releaseId=${releaseId}; sourceDirty=${sourceDirty}; frontend files=${fileManifest.length}. No AWS calls.`);
console.log('This is an explicit local build candidate, not a clean CI release or an approved deployment. Review manifest and plan before apply.');
