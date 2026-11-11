import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Could not inspect source revision');
  return result.stdout.trim();
}
const commit = git(['rev-parse', 'HEAD']);
const dirty = git(['status', '--porcelain']).length > 0;
if (process.env.CI && dirty) throw new Error('CI packaging requires a clean checkout');
const dist = join(root, 'frontend/dist');
if (!readFileSync(join(dist, 'index.html'), 'utf8').includes('/assets/')) throw new Error('Build frontend first');
const assets = readdirSync(join(dist, 'assets'));
if (!assets.some(name => /^.+-[\w-]+\.js$/.test(name)) || !assets.some(name => /^.+-[\w-]+\.css$/.test(name))) {
  throw new Error('Expected Vite hashed JS and CSS assets');
}
// This is a CI verification bundle, never an automatically approved production release.
writeFileSync(join(dist, 'version.json'), JSON.stringify({ commit, sourceDirty: dirty }) + '\n');
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
const manifest = files(dist).sort().map(path => ({
  path: relative(dist, path).replaceAll('\\', '/'),
  sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
}));
const output = join(root, '.local', 'artifacts', commit);
mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'manifest.json'), JSON.stringify({ commit, sourceDirty: dirty, files: manifest }, null, 2) + '\n');
// Relative POSIX-style paths work with Linux tar and Git Bash's GNU tar on Windows.
const tar = spawnSync('tar', ['-czf', relative(root, join(output, 'frontend.tar.gz')).replaceAll('\\', '/'), '-C', 'frontend/dist', '.'], { cwd: root, stdio: 'inherit' });
if (tar.status !== 0) throw new Error('Could not package frontend');
const digest = createHash('sha256').update(readFileSync(join(output, 'frontend.tar.gz'))).digest('hex');
writeFileSync(join(output, 'SHA256SUMS'), `${digest}  frontend.tar.gz\n`);
console.log(`Verified static bundle: ${relative(root, output)} (sourceDirty=${dirty})`);
