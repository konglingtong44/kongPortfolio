import assert from 'node:assert/strict';
import { bedrockContracts, contracts, presentationContracts } from './staging-contract.mjs';
import { coldQaMetrics, greenFailureReport, liveSnapshot, requireApprovedContext, requireGreenTarget, requireLiveUnchanged, requireProductionConfig, requireReviewedBedrockRelease } from './green-contract.mjs';

requireGreenTarget('kongportfolio-prod', '123456789012');
assert.throws(() => requireGreenTarget('kongportfolio-other', '123456789012'), /intended/);
const before = { Name: 'live', FunctionVersion: '2', RevisionId: 'revision-1' };
assert.equal(liveSnapshot(before).version, '2');
assert.throws(() => liveSnapshot({ ...before, RoutingConfig: { AdditionalVersionWeights: { '3': 0.1 } } }), /existing live traffic/);
assert.throws(() => requireLiveUnchanged(before, { ...before, FunctionVersion: '3' }), /Live alias changed/);
const manifest = { gitCommit: 'a'.repeat(40), releaseId: 'b'.repeat(64), backend: { sha256: 'c'.repeat(64) } };
const execution = { pipelineName: 'kongportfolio-candidate', pipelineExecutionId: 'run-1', status: 'InProgress', artifactRevisions: [{ name: 'SourceRef', revisionId: manifest.gitCommit }] };
const actions = ['Source', 'BuildCandidate', 'VerifyStaging', 'ApproveProduction'].map(stageName => ({ stageName, actionName: stageName === 'ApproveProduction' ? 'ApproveGreenCreation' : 'other', status: 'Succeeded', actionExecutionId: 'approved-action' }));
const staging = { schemaVersion: 1, kind: 'staging-verification', passed: true, pipelineExecutionId: 'run-1', gitCommit: manifest.gitCommit, releaseId: manifest.releaseId, backendSha256: manifest.backend.sha256, functionName: 'kongportfolio-stg', functionVersion: '3', checks: contracts.map(contract => ({ name: contract.label, status: 'passed' })) };
assert.equal(requireApprovedContext(execution, actions, manifest, staging, 'run-1'), 'approved-action');
assert.throws(() => requireApprovedContext({ ...execution, status: 'Stopped' }, actions, manifest, staging, 'run-1'), /active pipeline/);
assert.throws(() => requireApprovedContext(execution, actions.filter(action => action.stageName !== 'ApproveProduction'), manifest, staging, 'run-1'), /Required stage/);
assert.throws(() => requireApprovedContext(execution, actions, manifest, { ...staging, pipelineExecutionId: 'other-run' }, 'run-1'));
assert.throws(() => requireApprovedContext(execution, actions, manifest, { ...staging, releaseId: 'different' }, 'run-1'));
assert.throws(() => requireApprovedContext(execution, actions, manifest, { ...staging, checks: [] }, 'run-1'));
const account = '123456789012';
const config = { Runtime: 'java21', Handler: 'dev.kongortfolio.lambda.PortfolioLambdaHandler::handleRequest', MemorySize: 1024, Timeout: 28, Architectures: ['x86_64'], Role: `arn:aws:iam::${account}:role/kongportfolio-prod-lambda`, Environment: { Variables: { DEBUG: 'false', MANAGEMENT_HEALTH_DISKSPACE_PATH: '/tmp' } } };
requireProductionConfig(config, account);
const env = { ...config.Environment.Variables, BEDROCK_ENABLED: 'true', BEDROCK_FACTS_BUCKET: `kongportfolio-content-${account}-ap-northeast-1`, BEDROCK_FACTS_OWNER: account, BEDROCK_FACTS_VERSION: 'approved-v3', BEDROCK_FACTS_SHA256: 'd'.repeat(64), BEDROCK_MAX_OUTPUT_TOKENS: '1024', BEDROCK_TIMEOUT_SECONDS: '15' };
const enabled = { ...config, Environment: { Variables: env } };
requireProductionConfig(enabled, account);
for (const [key, bad] of [['BEDROCK_ENABLED', 'TRUE'], ['BEDROCK_FACTS_OWNER', '999999999999'], ['BEDROCK_FACTS_VERSION', 'null'], ['BEDROCK_FACTS_SHA256', 'wrong'], ['BEDROCK_MAX_OUTPUT_TOKENS', '2048'], ['BEDROCK_TIMEOUT_SECONDS', '20']]) {
  assert.throws(() => requireProductionConfig({ ...enabled, Environment: { Variables: { ...env, [key]: bad } } }, account));
}
const qaReport = { bedrock: { enabled: true, passed: true, policyVersion: 'portfolio-semantic-v2', checks: bedrockContracts.map(c => ({ name: c.label, status: 'passed', kind: c.kind, modelInvoked: true, usage: { inputTokens: 100, outputTokens: 50 } })) } };
qaReport.bedrock.presentationChecks = presentationContracts.map(c => ({ name: c.label, status: 'passed', kind: c.kind, modelInvoked: true, usage: { inputTokens: 100, outputTokens: 50 } }));
const stgConfig = { Environment: { Variables: { ...env, BEDROCK_TIMEOUT_SECONDS: '20' } } };
requireReviewedBedrockRelease(stgConfig, enabled, qaReport);
assert.throws(() => requireReviewedBedrockRelease(stgConfig, enabled, { bedrock: { ...qaReport.bedrock, passed: false } }));
assert.throws(() => requireReviewedBedrockRelease(stgConfig, { Environment: { Variables: { ...env, BEDROCK_FACTS_VERSION: 'unreviewed' } } }, qaReport));
assert.throws(() => requireReviewedBedrockRelease(stgConfig, enabled, { bedrock: { ...qaReport.bedrock, checks: [] } }));
const badRefusal = structuredClone(qaReport); badRefusal.bedrock.checks[0].usage.inputTokens = 0;
assert.throws(() => requireReviewedBedrockRelease(stgConfig, enabled, badRefusal));
for (const c of presentationContracts) {
  const missingPresentation = structuredClone(qaReport);
  missingPresentation.bedrock.presentationChecks = missingPresentation.bedrock.presentationChecks.filter(x => x.name !== c.label);
  assert.throws(() => requireReviewedBedrockRelease(stgConfig, enabled, missingPresentation));
  const failedPresentation = structuredClone(qaReport);
  failedPresentation.bedrock.presentationChecks.find(x => x.name === c.label).status = 'failed';
  assert.throws(() => requireReviewedBedrockRelease(stgConfig, enabled, failedPresentation));
}
const tail = text => ({ LogResult: Buffer.from(text).toString('base64') });
assert.deepEqual(coldQaMetrics(tail('INIT_REPORT Init Duration: 999 ms\nREPORT RequestId: cold-qa\tDuration: 1500 ms\tBilled Duration: 5500 ms\tInit Duration: 4000 ms')), { coldStartObserved: true, initMs: 4000, durationMs: 1500, combinedMs: 5500 });
assert.throws(() => coldQaMetrics(tail('REPORT RequestId: warm-qa\tDuration: 1000 ms')), /fresh Green cold/);
assert.throws(() => coldQaMetrics(tail('REPORT RequestId: slow-qa\tDuration: 24000 ms\tInit Duration: 5000 ms')), /headroom/);
console.log('Green guard checks passed: wrong target, existing traffic shift, changed live alias, missing approval and cross-run/candidate reports rejected. No AWS calls.');
console.log('Production Q&A guards passed: pinned facts/limits, STG match, semantic refusal usage evidence and real cold REPORT metrics required. No AWS calls.');
const failed = greenFailureReport({ pipelineExecutionId:'run',gitCommit:'commit',releaseId:'release',backendSha256:'hash',stagingVersion:'26',greenVersion:'22',failedCheck:'answer-en',checks:[],bedrock:{enabled:true,checks:[],answer:'PRIVATE_BODY'},lastInvocation:{name:'answer-en',kind:'answer',modelInvoked:true,usage:{inputTokens:10,outputTokens:2},answer:'PRIVATE_BODY'} },new Error('PRIVATE_BODY'));
assert.equal(failed.passed,false);assert.equal(failed.failedCheck,'answer-en');
assert.deepEqual(failed.lastInvocation.usage,{inputTokens:10,outputTokens:2});
assert.ok(!JSON.stringify(failed).includes('PRIVATE_BODY'));
console.log('Green failure diagnostics preserve failed check and usage without publishing answer text or raw errors.');
