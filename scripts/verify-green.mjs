import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { verifyCandidate } from './verify-pipeline-candidate.mjs';
import { apiEvent, checkResponse, contracts, matchingVersion, selectVersion } from './staging-contract.mjs';
import { liveSnapshot, requireApprovedContext, requireGreenTarget, requireLiveUnchanged, requireProductionConfig } from './green-contract.mjs';

const region = 'ap-northeast-1';
const functionName = process.env.GREEN_FUNCTION_NAME;
const account = process.env.GREEN_ACCOUNT_ID;
const executionId = process.env.GREEN_PIPELINE_EXECUTION_ID;
requireGreenTarget(functionName, account);
assert.match(executionId || '', /^[a-f0-9-]{36}$/);
assert.ok(process.env.CODEBUILD_SRC_DIR_Candidate && process.env.CODEBUILD_SRC_DIR_StagingReport, 'Both candidate and STG report artifacts are required');
const directory = resolve(process.env.CODEBUILD_SRC_DIR_Candidate);
const manifest = verifyCandidate(directory);
assert.equal(manifest.gitCommit, process.env.GREEN_SOURCE_COMMIT);
assert.equal(manifest.gitCommit, process.env.CODEBUILD_RESOLVED_SOURCE_VERSION);
const staging = JSON.parse(readFileSync(join(process.env.CODEBUILD_SRC_DIR_StagingReport, 'report.json'), 'utf8'));
const expectedHash = Buffer.from(manifest.backend.sha256, 'hex').toString('base64');
const workspace = resolve('.local/green-verification');
mkdirSync(workspace, { recursive: true });
function aws(args) {
  const result = spawnSync(process.env.GREEN_AWS_EXECUTABLE || 'aws', [...args, '--region', region, '--output', 'json'], { encoding: 'utf8', timeout: 180_000, env: { ...process.env, AWS_PAGER: '', PYTHONUTF8: '1' } });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `AWS ${args[0]} ${args[1]} failed: ${result.stderr}`);
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}
assert.equal(aws(['sts', 'get-caller-identity']).Account, account);
const execution = aws(['codepipeline', 'get-pipeline-execution', '--pipeline-name', 'kongportfolio-candidate', '--pipeline-execution-id', executionId]).pipelineExecution;
const actions = aws(['codepipeline', 'list-action-executions', '--pipeline-name', 'kongportfolio-candidate', '--filter', `pipelineExecutionId=${executionId}`]).actionExecutionDetails;
const approvalActionId = requireApprovedContext(execution, actions, manifest, staging, executionId);
const stg = aws(['lambda', 'get-function-configuration', '--function-name', 'kongportfolio-stg', '--qualifier', staging.functionVersion]);
assert.equal(stg.CodeSha256, expectedHash, 'Actual immutable STG code differs from candidate');
assert.equal(staging.lambdaCodeSha256, expectedHash);
const before = aws(['lambda', 'get-alias', '--function-name', functionName, '--name', 'live']);
const blue = liveSnapshot(before);
const current = aws(['lambda', 'get-function-configuration', '--function-name', functionName]);
requireProductionConfig(current, account);
const existing = aws(['lambda', 'list-versions-by-function', '--function-name', functionName]).Versions;
let version = current.CodeSha256 === expectedHash ? matchingVersion(existing, current, expectedHash) : undefined;
if (!version) {
  const updated = aws(['lambda', 'update-function-code', '--function-name', functionName, '--revision-id', current.RevisionId, '--zip-file', `fileb://${join(directory, 'backend.zip')}`, '--publish']);
  aws(['lambda', 'wait', 'function-updated', '--function-name', functionName]);
  const versions = /^[1-9][0-9]*$/.test(updated.Version) ? [] : aws(['lambda', 'list-versions-by-function', '--function-name', functionName]).Versions;
  version = selectVersion(updated, versions, current, expectedHash);
}
assert.notEqual(version, blue.version, 'Candidate is already live; a distinct Green deployment is not needed');
const green = aws(['lambda', 'get-function-configuration', '--function-name', functionName, '--qualifier', version]);
requireProductionConfig(green, account);
assert.equal(green.Version, version);
assert.equal(green.CodeSha256, expectedHash);
const checks = [];
for (const contract of contracts) {
  const payload = join(workspace, `${contract.label}-event.json`);
  const response = join(workspace, `${contract.label}-response.json`);
  writeFileSync(payload, JSON.stringify(apiEvent(contract.method, contract.path, contract.query)));
  const metadata = aws(['lambda', 'invoke', '--function-name', functionName, '--qualifier', version, '--invocation-type', 'RequestResponse', '--cli-binary-format', 'raw-in-base64-out', '--payload', `file://${payload}`, '--cli-read-timeout', '60', response]);
  assert.equal(metadata.ExecutedVersion, version);
  checkResponse(metadata, JSON.parse(readFileSync(response, 'utf8')), contract);
  checks.push({ name: contract.label, status: 'passed', expectedHttpStatus: contract.status });
  console.log(`Green passed: ${contract.label} (published version ${version})`);
}
const after = aws(['lambda', 'get-alias', '--function-name', functionName, '--name', 'live']);
requireLiveUnchanged(before, after);
const report = {
  schemaVersion: 1, kind: 'production-green-verification', passed: true,
  pipelineExecutionId: executionId, approval1ActionId: approvalActionId,
  gitCommit: manifest.gitCommit, releaseId: manifest.releaseId, backendSha256: manifest.backend.sha256,
  stagingVersion: staging.functionVersion, functionName, blueVersion: blue.version,
  greenVersion: version, lambdaCodeSha256: green.CodeSha256, liveAliasRevisionId: blue.revisionId,
  liveTrafficUnchanged: true, checks,
  frontend: 'same candidate verified; no website promotion in this Story',
};
writeFileSync(join(workspace, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Green verified: ${report.releaseId}; live stays ${blue.version}; awaiting human approval 2. No routing changes.`);
