import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { requireGreenEvidence, requireReleaseMode } from './deployment-contract.mjs';
import { digest, safePath } from './verify-pipeline-candidate.mjs';

const template = readFileSync(new URL('../infra/terraform/portfolio/spa.js.tftpl', import.meta.url), 'utf8');
export const normalizeCode = code => code.replace(/\r\n/g, '\n').trimEnd();
export function verifyRouterTest(result, expectedUri) {
  assert.ok(!result.FunctionErrorMessage,result.FunctionErrorMessage);
  // CloudFront wraps a returned request in {request: ...} in TestFunction output.
  assert.equal(JSON.parse(result.FunctionOutput).request?.uri,expectedUri);
}
export function routeCode(releaseId) {
  assert.match(releaseId, /^[a-f0-9]{64}$/);
  return template.replaceAll('${release_id}', releaseId);
}
export function routeRelease(code) {
  const release = /var prefix = '\/releases\/([a-f0-9]{64})';/.exec(code)?.[1];
  assert.ok(release, 'Unknown live release pointer');
  assert.equal(normalizeCode(code), normalizeCode(routeCode(release)), 'Router logic differs from reviewed template');
  return release;
}
export function frontendContext(execution, actions, manifest, staging, green, deployment, executionId, mode) {
  requireReleaseMode(mode, execution);
  requireGreenEvidence(execution, actions, manifest, staging, green, executionId);
  assert.ok(actions.some(a => a.stageName === 'DeployProduction' && a.actionName === 'CanaryAndVerify' && a.status === 'Succeeded'), 'Backend deployment must succeed first');
  assert.equal(deployment.schemaVersion, 1);
  assert.equal(deployment.kind, 'production-deployment');
  assert.equal(deployment.passed, true);
  assert.equal(deployment.mode, mode);
  for (const field of ['pipelineExecutionId', 'gitCommit', 'releaseId']) assert.equal(deployment[field], green[field]);
  assert.equal(deployment.blueVersion, green.blueVersion);
  assert.equal(deployment.greenVersion, green.greenVersion);
  assert.ok(deployment.deploymentId);
  assert.equal(deployment.outcome, mode === 'deploy' ? 'deployed' : 'automatic-rollback-verified');
  if(mode==='rollback_drill') {assert.equal(deployment.recovery?.verifiedBlue,true);assert.ok(deployment.recovery?.rollbackDeploymentId);}
}
export function frontendObjects(manifest) {
  assert.match(manifest.releaseId, /^[a-f0-9]{64}$/);
  const mime = {html:'text/html; charset=utf-8',json:'application/json',js:'text/javascript',css:'text/css',svg:'image/svg+xml',png:'image/png'};
  return manifest.frontend.map(file => {
    safePath(file.path);
    assert.match(file.sha256, /^[a-f0-9]{64}$/);
    assert.ok(mime[file.path.split('.').at(-1)], 'Unsupported frontend MIME type');
    assert.equal(file.contentType, mime[file.path.split('.').at(-1)]);
    assert.equal(file.cacheControl, ['index.html','version.json'].includes(file.path) ? 'no-cache,max-age=0,must-revalidate' : 'public,max-age=31536000,immutable');
    return {...file,key:`releases/${manifest.releaseId}/${file.path}`,checksum:Buffer.from(file.sha256,'hex').toString('base64')};
  });
}
export async function publishFrontend(io, manifest, mode) {
  assert.ok(['deploy','rollback_drill'].includes(mode));
  if (mode === 'rollback_drill') return {passed:true,skipped:true,reason:'rollback_drill'};
  const before = io.snapshot();
  const oldRelease = routeRelease(before.live.code);
  assert.equal(normalizeCode(before.development.code), normalizeCode(before.live.code), 'Unpublished router change requires review');
  const code = routeCode(manifest.releaseId);
  const checks=[];
  let staged=false;
  try {
    for (const file of frontendObjects(manifest)) io.upload(file);
    await io.verifyAssets();
    const fresh = io.snapshot();
    assert.equal(fresh.live.etag, before.live.etag, 'Live pointer changed during upload');
    assert.equal(fresh.development.etag, before.development.etag, 'Development router changed during upload');
    staged=true;
    const etag=io.stage(code, fresh.development.etag);
    await io.test(manifest.releaseId, etag);
    io.publish(etag);
    await io.verifyPointer(manifest.releaseId);
    assert.equal(normalizeCode(io.snapshot().live.code),normalizeCode(code),'Live router changed after publication');
    checks.push('immutable-assets','development-routing','live-html-version-assets-api');
    return {passed:true,skipped:false,oldRelease,newRelease:manifest.releaseId,checks,routerSha256:digest(normalizeCode(code))};
  } catch (error) {
    const recovery={restoredOld:false};
    if(staged) {
      try {
        const now=io.snapshot();
        const live=normalizeCode(now.live.code), dev=normalizeCode(now.development.code);
        const old=normalizeCode(before.live.code), next=normalizeCode(code);
        assert.ok([old,next].includes(live), 'Concurrent live change; refuse to overwrite');
        assert.ok([old,next].includes(dev), 'Concurrent development change; refuse to overwrite');
        if(dev!==old || live!==old) {
          const etag=io.stage(before.live.code,now.development.etag);
          if(live!==old) {await io.test(oldRelease,etag);io.publish(etag);}
        }
        await io.verifyPointer(oldRelease);
        const restored=io.snapshot();
        assert.equal(normalizeCode(restored.live.code),old);
        assert.equal(normalizeCode(restored.development.code),old);
        recovery.restoredOld=true;
      } catch(e) {recovery.error=e.message;}
    }
    error.frontendReport={passed:false,oldRelease,newRelease:manifest.releaseId,recovery,error:error.message};
    throw error;
  }
}
