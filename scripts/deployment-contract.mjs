import assert from 'node:assert/strict';
import { contracts } from './staging-contract.mjs';
import { liveSnapshot, requireApprovedContext } from './green-contract.mjs';

export function requireDeploymentContext(execution, actions, manifest, staging, green, executionId, live) {
  const first = requireApprovedContext(execution, actions, manifest, staging, executionId);
  assert.ok(actions.some(a => a.stageName === 'VerifyGreen' && a.actionName === 'PublishAndVerifyGreen' && a.status === 'Succeeded'));
  assert.ok(actions.some(a => a.stageName === 'ApproveTrafficShift' && a.actionName === 'ApproveBlueGreenDeployment' && a.status === 'Succeeded'), 'Human approval 2 required');
  assert.equal(green.schemaVersion, 1);
  assert.equal(green.kind, 'production-green-verification');
  assert.equal(green.passed, true);
  assert.equal(green.liveTrafficUnchanged, true);
  assert.equal(green.functionName, 'kongportfolio-prod');
  assert.equal(green.approval1ActionId, first);
  for (const field of ['pipelineExecutionId', 'gitCommit', 'releaseId', 'backendSha256']) assert.equal(green[field], staging[field]);
  assert.equal(green.stagingVersion, staging.functionVersion);
  assert.match(green.greenVersion, /^[1-9][0-9]*$/);
  assert.notEqual(green.greenVersion, green.blueVersion);
  assert.equal(green.checks.length, contracts.length);
  for (const c of contracts) assert.ok(green.checks.some(x => x.name === c.label && x.status === 'passed'));
  assert.deepEqual(liveSnapshot(live), { version: green.blueVersion, revisionId: green.liveAliasRevisionId }, 'Approved live snapshot is stale');
}
export function appSpec(blue, target) {
  for (const v of [blue, target]) assert.match(v, /^[1-9][0-9]*$/);
  return { version: 0.0, Resources: [{ Portfolio: { Type: 'AWS::Lambda::Function', Properties: {
    Name: 'kongportfolio-prod', Alias: 'live', CurrentVersion: blue, TargetVersion: target,
  } } }] };
}
export function verifyRouting(alias, blue, green) {
  assert.equal(alias.Name, 'live');
  assert.ok([blue, green].includes(alias.FunctionVersion), 'Unexpected live version');
  const weights = alias.RoutingConfig?.AdditionalVersionWeights || {};
  for (const [version, weight] of Object.entries(weights)) {
    assert.equal(alias.FunctionVersion, blue);
    assert.equal(version, green);
    assert.ok(Math.abs(weight - 0.1) < 0.0001, 'Unexpected canary weight');
  }
}

// Injected effects allow failure/timeout/recovery behavior to be verified without AWS writes.
export async function runDeployment(io, { blue, green, executionId }) {
  const description = `kongportfolio:${executionId}`;
  const terminal = new Set(['Succeeded', 'Failed', 'Stopped']);
  let activeId, baselineId, canaryId;
  const observations = [];
  async function wait(id, target, maxPolls) {
    for (let n = 0; n < maxPolls; n++) {
      const d = io.get(id);
      assert.equal(d.applicationName, 'kongportfolio');
      assert.equal(d.deploymentGroupName, 'production');
      assert.equal(d.description, description);
      if (['Failed', 'Stopped'].includes(d.status)) throw new Error(`CodeDeploy ${d.status}: ${id}`);
      const alias = io.alias();
      verifyRouting(alias, blue, green);
      await io.health();
      observations.push({ status: d.status, version: alias.FunctionVersion, weights: alias.RoutingConfig?.AdditionalVersionWeights || {} });
      if (d.status === 'Succeeded') {
        assert.equal(alias.FunctionVersion, target);
        assert.equal(Object.keys(alias.RoutingConfig?.AdditionalVersionWeights || {}).length, 0);
        if (target === green) assert.ok(observations.some(o => Math.abs((o.weights[green] || 0) - 0.1) < 0.0001), 'No observed 10% canary evidence');
        activeId = undefined;
        return;
      }
      await io.sleep(20_000);
    }
    throw new Error('Bounded deployment observation timed out');
  }
  try {
    if (!io.hasBaseline()) {
      baselineId = activeId = io.create(appSpec(blue, blue), 'CodeDeployDefault.LambdaAllAtOnce', description);
      await wait(baselineId, blue, 6);
      assert.ok(io.hasBaseline(), 'Initial Blue baseline was not recorded; refuse canary');
    }
    const before = io.alias();
    assert.equal(liveSnapshot(before).version, blue);
    canaryId = activeId = io.create(appSpec(blue, green), 'CodeDeployDefault.LambdaCanary10Percent5Minutes', description);
    await wait(canaryId, green, 24);
    return { passed: true, baselineId, deploymentId: canaryId, blueVersion: blue, greenVersion: green, observations };
  } catch (error) {
    const recovery = { requested: false, verifiedBlue: false };
    if (activeId) {
      try {
        const state = io.get(activeId);
        assert.equal(state.applicationName, 'kongportfolio');
        assert.equal(state.deploymentGroupName, 'production');
        assert.equal(state.description, description);
        if (!terminal.has(state.status)) { io.stop(activeId); recovery.requested = true; }
        // CodeDeploy controls rollback; never repair the alias directly from CodeBuild.
        for (let n = 0; n < 6; n++) {
          const alias = io.alias();
          if (alias.FunctionVersion === blue && !Object.keys(alias.RoutingConfig?.AdditionalVersionWeights || {}).length) {
            const rollbackId = io.get(activeId).rollbackInfo?.rollbackDeploymentId;
            if (rollbackId) recovery.rollbackDeploymentId = rollbackId;
            const originalTerminal = terminal.has(io.get(activeId).status);
            const rollbackDone = !rollbackId || io.get(rollbackId).status === 'Succeeded';
            if (originalTerminal && rollbackDone) { await io.health(); recovery.verifiedBlue = true; break; }
          }
          await io.sleep(10_000);
        }
        // A public HTTP failure can be found just after CodeDeploy reports success.
        // Restore Blue through CodeDeploy (never UpdateAlias), only from the known stable Green.
        if (!recovery.verifiedBlue && !io.get(activeId).rollbackInfo?.rollbackDeploymentId && terminal.has(io.get(activeId).status)) {
          const live = io.alias();
          if (liveSnapshot(live).version === green) {
            const restoreId = io.create(appSpec(green, blue), 'CodeDeployDefault.LambdaAllAtOnce', description);
            recovery.rollbackDeploymentId = restoreId;
            recovery.requested = true;
            for (let n = 0; n < 6; n++) {
              const restored = io.get(restoreId);
              if (restored.status === 'Succeeded' && liveSnapshot(io.alias()).version === blue) {
                await io.health(); recovery.verifiedBlue = true; break;
              }
              if (['Failed', 'Stopped'].includes(restored.status)) break;
              await io.sleep(10_000);
            }
          }
        }
      } catch (recoveryError) { recovery.error = recoveryError.message; }
    }
    error.deploymentReport = { passed: false, baselineId, deploymentId: canaryId, recovery, observations, error: error.message };
    throw error;
  }
}
