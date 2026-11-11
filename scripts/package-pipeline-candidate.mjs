import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, listFiles, verifyCandidate } from './verify-pipeline-candidate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 120_000 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout.trim();
}
assert.equal(process.env.CI, 'true', 'Candidate packaging requires explicit CI=true and a clean checkout');
const gitCommit = run('git', ['rev-parse', 'HEAD']);
assert.match(gitCommit, /^[a-f0-9]{40}$/);
assert.equal(run('git', ['status', '--porcelain']), '', 'Do not package uncommitted source');
if (process.env.CODEBUILD_RESOLVED_SOURCE_VERSION) {
  assert.equal(gitCommit, process.env.CODEBUILD_RESOLVED_SOURCE_VERSION, 'Git checkout differs from the CodeBuild source revision');
}
const zip = join(root, 'backend/target/kongPortfolio-lambda.zip');
const backendSha256 = digest(readFileSync(zip));
const releaseId = digest(JSON.stringify({ gitCommit, backendSha256 }));
const output = join(root, '.local/pipeline-candidate');
assert.ok(!existsSync(output), 'Candidate directory already exists; never overwrite a reviewed candidate');
mkdirSync(output, { recursive: true });
const frontend = join(output, 'frontend');
// Tests and type checking run in ci.sh; rebuild only to embed this candidate's asset prefix.
run(process.execPath, [join(root, 'frontend/node_modules/vite/bin/vite.js'), 'build', `--base=/releases/${releaseId}/`, `--outDir=${frontend}`], join(root, 'frontend'));
writeFileSync(join(frontend, 'version.json'), JSON.stringify({ releaseId, gitCommit, sourceDirty: false }) + '\n');
copyFileSync(zip, join(output, 'backend.zip'));
const mime = { html: 'text/html; charset=utf-8', json: 'application/json', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png' };
const files = listFiles(frontend).map(path => {
  const extension = path.split('.').at(-1);
  assert.ok(mime[extension], `Explicit MIME type required: ${path}`);
  return { path, sha256: digest(readFileSync(join(frontend, path))), contentType: mime[extension], cacheControl: ['index.html', 'version.json'].includes(path) ? 'no-cache,max-age=0,must-revalidate' : 'public,max-age=31536000,immutable' };
});
const manifest = { schemaVersion: 2, kind: 'pipeline-release-candidate', releaseId, gitCommit, sourceDirty: false, backend: { path: 'backend.zip', sha256: backendSha256 }, frontend: files };
writeFileSync(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const sums = listFiles(output).map(path => `${digest(readFileSync(join(output, path)))}  ${path}\n`).join('');
writeFileSync(join(output, 'SHA256SUMS'), sums);
assert.equal(run('git', ['status', '--porcelain']), '', 'Source changed while packaging');
verifyCandidate(output);
console.log(`Packaged candidate ${releaseId} from ${gitCommit}. No AWS calls or deployment.`);
