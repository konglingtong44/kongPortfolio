import assert from 'node:assert/strict';
import { bedrockContracts, contracts } from './staging-contract.mjs';

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
  const env = config.Environment?.Variables || {};
  assert.ok(env.BEDROCK_ENABLED === undefined || ['true', 'false'].includes(env.BEDROCK_ENABLED), 'Invalid production feature flag');
  if (env.BEDROCK_ENABLED === 'true') {
    assert.equal(env.BEDROCK_FACTS_BUCKET, `kongportfolio-content-${account}-ap-northeast-1`);
    assert.equal(env.BEDROCK_FACTS_OWNER, account);
    assert.ok(env.BEDROCK_FACTS_VERSION?.trim() && env.BEDROCK_FACTS_VERSION !== 'null', 'Pin the approved content version');
    assert.match(env.BEDROCK_FACTS_SHA256 || '', /^[0-9a-f]{64}$/);
    for (const [key, max] of [['BEDROCK_MAX_OUTPUT_TOKENS', 1024], ['BEDROCK_TIMEOUT_SECONDS', 15]]) {
      const n = Number(env[key]);
      assert.ok(Number.isInteger(n) && n >= (key === 'BEDROCK_MAX_OUTPUT_TOKENS' ? 16 : 1) && n <= max, `Invalid production ${key}`);
    }
  }
}

export function requireReviewedBedrockRelease(stgConfig, prodConfig, report) {
  const prod = prodConfig.Environment?.Variables || {};
  if (prod.BEDROCK_ENABLED !== 'true') return;
  const stg = stgConfig.Environment?.Variables || {};
  assert.equal(stg.BEDROCK_ENABLED, 'true', 'STG must have tested real Q&A');
  for (const key of ['BEDROCK_FACTS_BUCKET', 'BEDROCK_FACTS_OWNER', 'BEDROCK_FACTS_VERSION', 'BEDROCK_FACTS_SHA256', 'BEDROCK_MAX_OUTPUT_TOKENS']) {
    assert.equal(prod[key], stg[key], `Production differs from STG reviewed ${key}`);
  }
  assert.equal(report.bedrock?.enabled, true);
  assert.equal(report.bedrock?.passed, true);
  assert.equal(report.bedrock?.policyVersion, 'portfolio-scope-v1');
  assert.equal(report.bedrock?.checks?.length, bedrockContracts.length);
  for (const c of bedrockContracts) {
    const check = report.bedrock.checks.find(x => x.name === c.label);
    assert.equal(check?.status, 'passed', `Missing successful STG ${c.label}`);
    assert.equal(check.kind, c.kind);
    assert.equal(check.modelInvoked, c.kind === 'answer');
    if (c.kind === 'refused') assert.deepEqual(check.usage, { inputTokens: 0, outputTokens: 0 });
    else assert.ok(check.usage?.inputTokens > 0 && check.usage?.outputTokens > 0 && check.usage.outputTokens <= Number(prod.BEDROCK_MAX_OUTPUT_TOKENS));
  }
}

export function coldQaMetrics(metadata) {
  const tail = Buffer.from(metadata.LogResult || '', 'base64').toString('utf8');
  const report = /^REPORT RequestId:[^\r\n]+/m.exec(tail)?.[0] || '';
  const init = /Init Duration:\s*([0-9.]+) ms/.exec(report);
  const duration = /REPORT RequestId:\s*\S+\s+Duration:\s*([0-9.]+) ms/.exec(report);
  assert.ok(init && duration, 'A fresh Green cold Q&A invocation is required; do not relabel a warm invocation as cold');
  const initMs = Number(init[1]), durationMs = Number(duration[1]);
  assert.ok(Number.isFinite(initMs) && Number.isFinite(durationMs) && initMs >= 0 && durationMs >= 0);
  assert.ok(initMs + durationMs < 28000, 'Cold Q&A must leave headroom below the 30-second API integration timeout');
  return { coldStartObserved: true, initMs, durationMs, combinedMs: initMs + durationMs };
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
  assert.equal(execution.status, 'InProgress', 'Only an active pipeline execution may publish Green; never reuse a stopped execution approval');
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
