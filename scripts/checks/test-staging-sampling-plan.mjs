import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { samplingPlan } from './plan-staging-sampling.mjs';

test('default draft enumerates thirty requests with three samples per case and all languages', () => {
  const plan = samplingPlan();
  assert.equal(plan.requests.length, 30);
  assert.equal(plan.limits.maxRequests, 30);
  assert.deepEqual([...new Set(plan.requests.map(row => row.language))].sort(), ['en', 'ja', 'zh']);
  for (const id of new Set(plan.requests.map(row => row.sampleId))) {
    assert.deepEqual(plan.requests.filter(row => row.sampleId === id).map(row => row.repetition), [1, 2, 3]);
  }
  assert.equal(plan.requests[0].earliestStartAfterSeconds, 70);
  for (let i = 1; i < plan.requests.length; i++) {
    assert.ok(plan.requests[i].earliestStartAfterSeconds - plan.requests[i - 1].earliestStartAfterSeconds >= 15);
  }
});
test('estimates explicit assumptions and stays a draft without fabricated cloud identity or approvals', () => {
  const plan = samplingPlan();
  assert.equal(plan.scenario.estimatedModelUsd, 0.0811632);
  assert.equal(plan.scenario.hardBillingCap, false);
  assert.equal(plan.executable, false);
  assert.equal(plan.approvalsGranted, false);
  assert.equal(plan.target.functionVersion, null);
  assert.equal(plan.limits.retries, 0);
  assert.equal(plan.limits.concurrency, 1);
  assert.match(plan.contractsSha256, /^[a-f0-9]{64}$/);
});
test('rejects excessive calls, output, budget assumptions, fast spacing and unknown options', () => {
  for (const options of [null, [], { repeats: 4 }, { repeats: 0 }, { assumedInputTokens: 12000 },
    { outputTokens: 2048 }, { scenarioBudgetUsd: 0 }, { scenarioBudgetUsd: Infinity },
    { assumedInputTokens: '6000' }, { spacingSeconds: 1 }, { execute: true }, { retries: 1 }]) {
    assert.throws(() => samplingPlan(options));
  }
  assert.equal(samplingPlan({ repeats: 1 }).limits.maxRequests, 10);
  assert.equal(samplingPlan({ assumedInputTokens: 12000, scenarioBudgetUsd: 0.2 }).limits.maxRequests, 30);
});
test('CLI works outside repo and only prints a non-executable local plan', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./plan-staging-sampling.mjs', import.meta.url))],
    { encoding: 'utf8', cwd: tmpdir(), env: { ...process.env, AWS_PROFILE: 'not-a-real-profile' } });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).executable, false);
});
