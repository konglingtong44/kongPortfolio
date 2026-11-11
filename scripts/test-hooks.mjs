import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Windows can execute hooks without Unix mode bits; Linux requires them.
// Inspect Git's index so local verification catches broken cloud checkouts.
for (const hook of ['pre-commit', 'pre-push']) {
  const tracked = spawnSync('git', ['ls-files', '--stage', '--', `.githooks/${hook}`], { cwd: root, encoding: 'utf8' });
  assert.equal(tracked.status, 0, tracked.stderr);
  assert.match(tracked.stdout, /^100755 /, `${hook} must be executable in Git for Linux CI`);
}
mkdirSync(join(root, '.local'), { recursive: true });
const fixture = mkdtempSync(join(root, '.local', 'hook-test-'));
function git(args, env = process.env) {
  const result = spawnSync('git', args, { cwd: fixture, encoding: 'utf8', env });
  if (result.error) throw result.error;
  return result;
}
function checked(args) {
  const result = git(args);
  assert.equal(result.status, 0, result.stderr);
}
checked(['init', '-q']);
checked(['config', 'core.hooksPath', join(root, '.githooks').replaceAll('\\', '/')]);
copyFileSync(join(root, '.gitignore'), join(fixture, '.gitignore'));
copyFileSync(join(root, '.gitleaks.toml'), join(fixture, '.gitleaks.toml'));
const forbidden = [
  '.local/private.txt', 'nested/.local/private.txt', 'Resume_demo.pdf',
  '履歴書_架空.xls', '職務経歴書_架空.xlsx', '简历.docx', 'CV example.pdf',
  '.env.local', '.aws/credentials', 'nested/.ssh/config', 'secrets/example.txt',
  'certificate.crt', 'private.pem', 'debug.log', 'service-account-test.json',
  'infra/.terraform/terraform.tfstate', 'infra/terraform.tfstate',
  'infra/terraform.tfstate.backup', 'infra/review.tfplan', 'infra/terraform.tfvars',
  'infra/prod.tfvars.json', 'infra/terraform.tfstate.tflock', 'infra/backend.hcl',
  'infra/override.tf', 'infra/local_override.tf.json', '.terraformrc', 'terraform.rc',
  'infra/review.tfplan.json',
];
for (const path of forbidden) {
  checked(['read-tree', '--empty']);
  const absolute = join(fixture, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, 'Synthetic fixture only.\n');
  assert.equal(git(['check-ignore', '-q', '--', path]).status, 0, `Not ignored: ${path}`);
  checked(['add', '-f', '--', path]);
  const result = git(['hook', 'run', 'pre-commit']);
  assert.notEqual(result.status, 0, `Hook allowed ${path}`);
  assert.match(result.stderr, /Commit blocked: private local data/);
}
checked(['read-tree', '--empty']);
writeFileSync(join(fixture, 'README.md'), '# Synthetic public source\n');
checked(['add', '--', 'README.md']);
checked(['hook', 'run', 'pre-commit']);

// Public Terraform source, lockfile and placeholder templates must remain trackable.
for (const path of ['infra/main.tf', 'infra/.terraform.lock.hcl', 'infra/backend.hcl.example', 'infra/terraform.tfvars.example']) {
  const absolute = join(fixture, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, '# Public configuration fixture\n');
  assert.equal(git(['check-ignore', '-q', '--', path]).status, 1, `Public source ignored: ${path}`);
  checked(['add', '--', path]);
}
checked(['hook', 'run', 'pre-commit']);

// The hook must refuse to continue when the scanner is unavailable.
const noTools = join(fixture, 'empty-path');
mkdirSync(noTools);
const env = { ...process.env };
for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
env.PATH = noTools;
let shell = '/bin/sh';
if (process.platform === 'win32') {
  const gitPath = spawnSync('where.exe', ['git'], { encoding: 'utf8' }).stdout.trim().split(/\r?\n/)[0];
  shell = ['../bin/sh.exe', '../../bin/sh.exe', 'sh.exe']
    .map(path => resolve(dirname(gitPath), path)).find(existsSync);
  assert.ok(shell, 'Could not find Git for Windows shell');
}
const missing = spawnSync(shell, [join(root, '.githooks/pre-commit')], { cwd: fixture, env, encoding: 'utf8' });
assert.equal(missing.status, 1, missing.stderr);
assert.match(missing.stderr, /Gitleaks is required/);
console.log(`Hook checks passed: ${forbidden.length} forced private paths blocked, public source accepted, missing scanner blocked.`);
console.log('Synthetic fixtures retained under ignored .local/.');
