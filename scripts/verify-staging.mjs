import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { verifyCandidate } from './verify-pipeline-candidate.mjs';
import { apiEvent, checkResponse, contracts, matchingVersion, requireStagingConfig, requireStagingTarget, selectVersion } from './staging-contract.mjs';

const region = 'ap-northeast-1';
const functionName = process.env.STAGING_FUNCTION_NAME;
const account = process.env.STAGING_ACCOUNT_ID;
requireStagingTarget(functionName, account);
assert.match(process.env.STAGING_SOURCE_COMMIT || '', /^[a-f0-9]{40}$/);
assert.match(process.env.STAGING_PIPELINE_EXECUTION_ID || '', /^[a-f0-9-]{36}$/);
assert.ok(process.env.CODEBUILD_SRC_DIR_Candidate, 'CodePipeline Candidate artifact is required');
const directory = resolve(process.env.CODEBUILD_SRC_DIR_Candidate);
const manifest = verifyCandidate(directory);
assert.equal(manifest.gitCommit, process.env.STAGING_SOURCE_COMMIT, 'Candidate does not match pipeline Source revision');
assert.equal(manifest.gitCommit, process.env.CODEBUILD_RESOLVED_SOURCE_VERSION, 'Primary source differs from candidate');
const expectedHash = Buffer.from(manifest.backend.sha256, 'hex').toString('base64');
const workspace = resolve('.local/staging-verification');
mkdirSync(workspace, { recursive: true });
function aws(args) {
  const result = spawnSync(process.env.STAGING_AWS_EXECUTABLE || 'aws', [...args, '--region', region, '--output', 'json'], { encoding: 'utf8', timeout: 180_000, env: { ...process.env, AWS_PAGER: '', PYTHONUTF8: '1' } });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `AWS ${args[0]} ${args[1]} failed: ${result.stderr}`);
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}
assert.equal(aws(['sts', 'get-caller-identity']).Account, account, 'AWS account mismatch');
const current = aws(['lambda', 'get-function-configuration', '--function-name', functionName]);
requireStagingConfig(current, account);
const existing = aws(['lambda', 'list-versions-by-function', '--function-name', functionName]).Versions;
let version = current.CodeSha256 === expectedHash ? matchingVersion(existing, current, expectedHash) : undefined;
if (!version) {
  const updated = aws(['lambda', 'update-function-code', '--function-name', functionName, '--revision-id', current.RevisionId, '--zip-file', `fileb://${join(directory, 'backend.zip')}`, '--publish']);
  aws(['lambda', 'wait', 'function-updated', '--function-name', functionName]);
  const versions = /^[1-9][0-9]*$/.test(updated.Version) ? [] : aws(['lambda', 'list-versions-by-function', '--function-name', functionName]).Versions;
  version = selectVersion(updated, versions, current, expectedHash);
}
const deployed = aws(['lambda', 'get-function-configuration', '--function-name', functionName, '--qualifier', version]);
requireStagingConfig(deployed, account);
assert.equal(deployed.Version, version, 'Lambda did not resolve the selected immutable version');
assert.equal(deployed.CodeSha256, expectedHash, 'Published STG version differs from artifact');
const checks = [];
for (const contract of contracts) {
  const payload = join(workspace, `${contract.label}-event.json`);
  const response = join(workspace, `${contract.label}-response.json`);
  writeFileSync(payload, JSON.stringify(apiEvent(contract.method, contract.path, contract.query)));
  const metadata = aws(['lambda', 'invoke', '--function-name', functionName, '--qualifier', version, '--invocation-type', 'RequestResponse', '--cli-binary-format', 'raw-in-base64-out', '--payload', `file://${payload}`, '--cli-read-timeout', '60', response]);
  assert.equal(metadata.ExecutedVersion, version, 'Invocation executed a different Lambda version');
  checkResponse(metadata, JSON.parse(readFileSync(response, 'utf8')), contract);
  checks.push({ name: contract.label, status: 'passed', expectedHttpStatus: contract.status });
  console.log(`STG passed: ${contract.label} (published version ${version})`);
}
const report = {
  schemaVersion: 1, kind: 'staging-verification', passed: true,
  pipelineExecutionId: process.env.STAGING_PIPELINE_EXECUTION_ID,
  gitCommit: manifest.gitCommit, releaseId: manifest.releaseId, backendSha256: manifest.backend.sha256,
  functionName, functionVersion: version, lambdaCodeSha256: deployed.CodeSha256,
  frontend: 'candidate checksums and version prefix verified; no separate STG browser/HTTP endpoint', checks,
};
writeFileSync(join(workspace, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`STG verified: ${report.releaseId}; awaiting human production approval. No production change.`);
