import assert from 'node:assert/strict';
import { contracts } from './staging-contract.mjs';

export function requireGreenTarget(name, account) {
  assert.equal(name, 'kongportfolio-prod', 'Green may target only the intended production function');
  assert.match(account, /^[0-9]{12}$/);
}
export function requireProductionConfig(config, account) {
  assert.equal(config.Runtime, 'java21');
  assert.equal(config.Handler, 'dev.kongortfolio.lambda.PortfolioLambdaHandler::handleRequest');
  assert.equal(config.MemorySize, 1024);
  assert.equal(config.Timeout, 28);
  assert.deepEqual(config.Architectures, ['x86_64']);
  assert.equal(config.Environment?.Variables?.DEBUG, 'false');
  assert.equal(config.Environment?.Variables?.MANAGEMENT_HEALTH_DISKSPACE_PATH, '/tmp');
  assert.equal(config.Role, `arn:aws:iam::${account}:role/kongportfolio-prod-lambda`);
}
export function liveSnapshot(alias) {
  assert.equal(alias.Name, 'live');
  assert.match(alias.FunctionVersion, /^[1-9][0-9]*$/);
  assert.ok(alias.RevisionId);
  const weights = alias.RoutingConfig?.AdditionalVersionWeights || {};
  assert.equal(Object.keys(weights).length, 0, 'An existing live traffic shift must finish before Green verification');
  return { version: alias.FunctionVersion, revisionId: alias.RevisionId };
}
export function requireLiveUnchanged(before, after) {
  assert.deepEqual(liveSnapshot(after), liveSnapshot(before), 'Live alias changed during Green verification');
}
export function requireApprovedContext(execution, actions, manifest, staging, executionId) {
  assert.equal(execution.pipelineName, 'kongportfolio-candidate');
  assert.equal(execution.pipelineExecutionId, executionId);
  assert.equal(execution.artifactRevisions.find(item => item.name === 'SourceRef')?.revisionId, manifest.gitCommit, 'Pipeline source differs from candidate');
  for (const stage of ['Source', 'BuildCandidate', 'VerifyStaging', 'ApproveProduction']) {
    assert.ok(actions.some(action => action.stageName === stage && action.status === 'Succeeded'), `Required stage not successful: ${stage}`);
  }
  const approval = actions.find(action => action.stageName === 'ApproveProduction' && action.actionName === 'ApproveGreenCreation' && action.status === 'Succeeded');
  assert.ok(approval, 'Human approval 1 is required before publishing Green');
  assert.equal(staging.schemaVersion, 1);
  assert.equal(staging.kind, 'staging-verification');
  assert.equal(staging.passed, true);
  assert.equal(staging.pipelineExecutionId, executionId);
  assert.equal(staging.gitCommit, manifest.gitCommit);
  assert.equal(staging.releaseId, manifest.releaseId);
  assert.equal(staging.backendSha256, manifest.backend.sha256);
  assert.equal(staging.functionName, 'kongportfolio-stg');
  assert.match(staging.functionVersion, /^[1-9][0-9]*$/);
  assert.equal(staging.checks.length, contracts.length);
  for (const contract of contracts) assert.ok(staging.checks.some(check => check.name === contract.label && check.status === 'passed'), `STG check missing: ${contract.label}`);
  return approval.actionExecutionId;
}
