import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const zip = join(root, 'backend/target/kongPortfolio-lambda.zip');
assert.ok(existsSync(zip), 'Run mvn -f backend/pom.xml -Plambda clean verify first');
assert.ok(statSync(zip).size < 50 * 1024 * 1024, 'ZIP exceeds direct Lambda upload limit');
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 120_000 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}
const entries = run('jar', ['--list', '--file', zip], root).trim().split(/\r?\n/);
assert.ok(entries.includes('lib/backend-0.1.0.jar'), 'Project JAR is missing from ZIP');
assert.ok(entries.every(path => path === 'lib/' || /^lib\/[\w.+-]+\.jar$/.test(path)), 'Unexpected ZIP entry');
mkdirSync(join(root, '.local'), { recursive: true });
const extracted = mkdtempSync(join(root, '.local/lambda-package-'));
run('jar', ['--extract', '--file', zip], extracted);
const library = join(extracted, 'lib');
const size = readdirSync(library).reduce((sum, name) => sum + statSync(join(library, name)).size, 0);
assert.ok(size < 250 * 1024 * 1024, 'Uncompressed Lambda package exceeds 250 MB');
const applicationEntries = run('jar', ['--list', '--file', join(library, 'backend-0.1.0.jar')], extracted);
assert.ok(applicationEntries.includes('dev/kongortfolio/lambda/PortfolioLambdaHandler.class'));
assert.ok(!applicationEntries.includes('BOOT-INF/'), 'Lambda needs a plain JAR, not a Boot executable JAR');
const output = run('java', ['-Ddebug=false', '--class-path', join(library, '*'), join(root, 'scripts/LambdaPackageSmoke.java')], extracted);
assert.ok(output.includes('Packaged Lambda smoke passed:'));
assert.ok(!existsSync(join(extracted, '.local/logs/info.log')), 'Lambda created a local log file');
console.log(output.trim().split(/\r?\n/).at(-1));
console.log(`ZIP ${(statSync(zip).size / 1024 / 1024).toFixed(1)} MiB; extracted libraries ${(size / 1024 / 1024).toFixed(1)} MiB. No AWS calls.`);
