import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { verifyCandidate } from './verify-pipeline-candidate.mjs';
import { requireProductionConfig } from './green-contract.mjs';
import { requireDeploymentContext, runDeployment } from './deployment-contract.mjs';
import { contracts } from './staging-contract.mjs';

const account = process.env.DEPLOY_ACCOUNT_ID;
const executionId = process.env.DEPLOY_PIPELINE_EXECUTION_ID;
assert.match(account || '', /^\d{12}$/);
assert.match(executionId || '', /^[a-f0-9-]{36}$/);
for (const name of ['Candidate', 'StagingReport', 'GreenReport']) assert.ok(process.env[`CODEBUILD_SRC_DIR_${name}`]);
const manifest = verifyCandidate(resolve(process.env.CODEBUILD_SRC_DIR_Candidate));
assert.equal(manifest.gitCommit, process.env.DEPLOY_SOURCE_COMMIT);
assert.equal(manifest.gitCommit, process.env.CODEBUILD_RESOLVED_SOURCE_VERSION);
const staging = JSON.parse(readFileSync(join(process.env.CODEBUILD_SRC_DIR_StagingReport, 'report.json')));
const green = JSON.parse(readFileSync(join(process.env.CODEBUILD_SRC_DIR_GreenReport, 'report.json')));
const out = resolve('.local/deployment-verification');
mkdirSync(out, { recursive: true });
function aws(args) {
  const result = spawnSync('aws', [...args, '--region', 'ap-northeast-1', '--output', 'json'], {encoding:'utf8', timeout:60_000, env:{...process.env, AWS_PAGER:'', PYTHONUTF8:'1'}});
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `AWS ${args[0]} ${args[1]} failed: ${result.stderr}`);
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}
const alias = () => aws(['lambda','get-alias','--function-name','kongportfolio-prod','--name','live']);
const group = () => aws(['deploy','get-deployment-group','--application-name','kongportfolio','--deployment-group-name','production']).deploymentGroupInfo;
assert.equal(aws(['sts','get-caller-identity']).Account, account);
const execution = aws(['codepipeline','get-pipeline-execution','--pipeline-name','kongportfolio-candidate','--pipeline-execution-id',executionId]).pipelineExecution;
const actions = aws(['codepipeline','list-action-executions','--pipeline-name','kongportfolio-candidate','--filter',`pipelineExecutionId=${executionId}`]).actionExecutionDetails;
requireDeploymentContext(execution, actions, manifest, staging, green, executionId, alias());
const config = aws(['lambda','get-function-configuration','--function-name','kongportfolio-prod','--qualifier',green.greenVersion]);
requireProductionConfig(config, account);
assert.equal(config.CodeSha256, Buffer.from(manifest.backend.sha256,'hex').toString('base64'));
const settings = group();
assert.equal(settings.deploymentConfigName, 'CodeDeployDefault.LambdaCanary10Percent5Minutes');
assert.equal(settings.alarmConfiguration?.enabled, true);
assert.equal(settings.alarmConfiguration?.ignorePollAlarmFailure, false);
assert.ok(settings.alarmConfiguration.alarms.some(a => a.name === 'kongportfolio-prod-live-errors'));
assert.equal(settings.autoRollbackConfiguration?.enabled, true);
for (const event of ['DEPLOYMENT_FAILURE','DEPLOYMENT_STOP_ON_ALARM','DEPLOYMENT_STOP_ON_REQUEST']) assert.ok(settings.autoRollbackConfiguration.events.includes(event));
const prior = aws(['deploy','list-deployments','--application-name','kongportfolio','--deployment-group-name','production']).deployments;
for (const id of prior) {
  const d = aws(['deploy','get-deployment','--deployment-id',id]).deploymentInfo;
  assert.ok(!['Created','Queued','InProgress','Ready','Baking'].includes(d.status), 'Another deployment is active');
  assert.notEqual(d.description, `kongportfolio:${executionId}`, 'Execution already attempted a deployment; inspect it rather than replaying');
}
let sample = 0;
async function health() {
  const r = await fetch('https://konglingtong44.com/api/health', {signal:AbortSignal.timeout(30_000), redirect:'error', headers:{'cache-control':'no-cache'}});
  assert.equal(r.status, 200, 'Public API health HTTP failure');
  assert.equal((await r.json()).status, 'UP');
  const contract = contracts[1 + (sample++ % 3)];
  const profile = await fetch(`https://konglingtong44.com${contract.path}?${contract.query}`, {signal:AbortSignal.timeout(30_000), redirect:'error'});
  assert.equal(profile.status, 200, 'Public profile HTTP failure');
  assert.ok((profile.headers.get('cache-control') || '').includes('no-store'));
  assert.ok((await profile.text()).includes(contract.marker), 'Public profile content differs');
}
await health();
let ownDeployment;
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
  if (ownDeployment) {
    try {
      const d = aws(['deploy','get-deployment','--deployment-id',ownDeployment]).deploymentInfo;
      if (d.applicationName === 'kongportfolio' && d.deploymentGroupName === 'production' && d.description === `kongportfolio:${executionId}` && !['Succeeded','Failed','Stopped'].includes(d.status)) {
        aws(['deploy','stop-deployment','--deployment-id',ownDeployment,'--auto-rollback-enabled']);
      }
    } catch (e) { console.error(`Deployment stop could not be confirmed: ${e.message}`); }
  }
  process.exit(143);
});
let report;
try {
  report = await runDeployment({
    alias, health, sleep,
    hasBaseline: () => {
      const id = group().lastSuccessfulDeployment?.deploymentId;
      if (!id) return false;
      const d = aws(['deploy','get-deployment','--deployment-id',id]).deploymentInfo;
      if (d.status !== 'Succeeded' || d.applicationName !== 'kongportfolio' || d.deploymentGroupName !== 'production') return false;
      try {
        const resources = JSON.parse(d.revision.appSpecContent.content).Resources;
        return resources.length === 1 && Object.values(resources[0]).some(r => r.Type === 'AWS::Lambda::Function' && r.Properties.Name === 'kongportfolio-prod' && r.Properties.Alias === 'live' && r.Properties.TargetVersion === green.blueVersion);
      } catch { return false; }
    },
    get: id => aws(['deploy','get-deployment','--deployment-id',id]).deploymentInfo,
    stop: id => aws(['deploy','stop-deployment','--deployment-id',id,'--auto-rollback-enabled']),
    create: (spec, configuration, description) => {
      const content = JSON.stringify(spec);
      const input = {applicationName:'kongportfolio', deploymentGroupName:'production', deploymentConfigName:configuration, description,
        revision:{revisionType:'AppSpecContent', appSpecContent:{content, sha256:createHash('sha256').update(content).digest('hex')}}};
      const path = join(out, 'request.json');
      writeFileSync(path, JSON.stringify(input));
      ownDeployment = aws(['deploy','create-deployment','--cli-input-json',`file://${path}`]).deploymentId;
      writeFileSync(join(out,'active-deployment.json'), JSON.stringify({deploymentId:ownDeployment,executionId}));
      return ownDeployment;
    },
  }, {blue:green.blueVersion, green:green.greenVersion, executionId});
} catch (error) {
  report = error.deploymentReport || {passed:false,error:error.message};
  throw error;
} finally {
  writeFileSync(join(out,'report.json'), JSON.stringify({schemaVersion:1,kind:'production-deployment',pipelineExecutionId:executionId,gitCommit:manifest.gitCommit,releaseId:manifest.releaseId,...report}, null, 2)+'\n');
}
console.log(`CodeDeploy verified ${report.deploymentId}; live ${report.greenVersion}; release ${manifest.releaseId}`);
