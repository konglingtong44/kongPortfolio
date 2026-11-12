import assert from 'node:assert/strict';
import vm from 'node:vm';
import { frontendContext,frontendObjects,publishFrontend,routeCode,routeRelease } from './frontend-release.mjs';
const old='a'.repeat(64),next='b'.repeat(64);
const file=(path,type)=>({path,contentType:type,cacheControl:['index.html','version.json'].includes(path)?'no-cache,max-age=0,must-revalidate':'public,max-age=31536000,immutable',sha256:'c'.repeat(64)});
const manifest={gitCommit:'d'.repeat(40),releaseId:next,backend:{sha256:'e'.repeat(64)},frontend:[file('index.html','text/html; charset=utf-8'),file('version.json','application/json'),file('assets/a.js','text/javascript')]};
assert.equal(routeRelease(routeCode(old)),old);
assert.throws(()=>routeRelease(routeCode(old).replace("uri === '/api'","uri === '/unexpected'")),/differs/);
assert.throws(()=>frontendObjects({...manifest,releaseId:'../../bad'}));
assert.throws(()=>frontendObjects({...manifest,frontend:[file('../bad.js','text/javascript')]}));
assert.throws(()=>frontendObjects({...manifest,frontend:[{...file('assets/a.js','text/html'),cacheControl:'public'}]}));
assert.throws(()=>frontendObjects({...manifest,frontend:[{path:'bad.exe',sha256:'c'.repeat(64),cacheControl:'public,max-age=31536000,immutable'}]}));
assert.equal(frontendObjects(manifest)[2].key,`releases/${next}/assets/a.js`);
const request={method:'GET',uri:'/projects/one',querystring:{}};
const context=vm.createContext({});vm.runInContext(routeCode(next),context);assert.equal(context.handler({request}).uri,`/releases/${next}/index.html`);

const checks=['health','profile-ja','profile-zh','profile-en','bedrock-placeholder','api-not-found','method-not-allowed'].map(name=>({name,status:'passed'}));
const execution={pipelineName:'kongportfolio-candidate',pipelineExecutionId:'run-1',artifactRevisions:[{name:'SourceRef',revisionId:manifest.gitCommit}],variables:[{name:'ReleaseMode',resolvedValue:'deploy'}]};
const actions=['Source','BuildCandidate','VerifyStaging','ApproveProduction','VerifyGreen','ApproveTrafficShift','DeployProduction'].map(stageName=>({stageName,status:'Succeeded',actionExecutionId:'approval1',actionName:({ApproveProduction:'ApproveGreenCreation',VerifyGreen:'PublishAndVerifyGreen',ApproveTrafficShift:'ApproveBlueGreenDeployment',DeployProduction:'CanaryAndVerify'})[stageName]||'action'}));
const stg={schemaVersion:1,kind:'staging-verification',passed:true,pipelineExecutionId:'run-1',gitCommit:manifest.gitCommit,releaseId:next,backendSha256:manifest.backend.sha256,functionName:'kongportfolio-stg',functionVersion:'7',checks};
const green={...stg,kind:'production-green-verification',liveTrafficUnchanged:true,functionName:'kongportfolio-prod',approval1ActionId:'approval1',stagingVersion:'7',blueVersion:'5',greenVersion:'6'};
const deployment={schemaVersion:1,kind:'production-deployment',passed:true,mode:'deploy',outcome:'deployed',pipelineExecutionId:'run-1',gitCommit:manifest.gitCommit,releaseId:next,blueVersion:'5',greenVersion:'6',deploymentId:'d-example'};
const validate=(d=deployment,a=actions)=>frontendContext(execution,a,manifest,stg,green,d,'run-1','deploy');
validate();assert.throws(()=>validate({...deployment,pipelineExecutionId:'old-run'}));assert.throws(()=>validate({...deployment,passed:false}));assert.throws(()=>validate(deployment,actions.filter(a=>a.stageName!=='ApproveTrafficShift')));assert.throws(()=>validate(deployment,actions.filter(a=>a.stageName!=='DeployProduction')));
const drillExecution={...execution,variables:[{name:'ReleaseMode',resolvedValue:'rollback_drill'}]};
const drillDeployment={...deployment,mode:'rollback_drill',outcome:'automatic-rollback-verified',recovery:{verifiedBlue:true,rollbackDeploymentId:'d-rollback'}};
frontendContext(drillExecution,actions,manifest,stg,green,drillDeployment,'run-1','rollback_drill');
assert.throws(()=>frontendContext(drillExecution,actions,manifest,stg,green,{...drillDeployment,recovery:{}},'run-1','rollback_drill'));

function fake({uploadFailure=false,testFailure=false,postFailure=false,concurrent=false,concurrentAfterPublish=false}={}){
 let live=routeCode(old),dev=live,version=0,snapshots=0;const events=[];
 const io={
  snapshot:()=>{snapshots++;if(concurrent&&snapshots>1){live=routeCode('f'.repeat(64));version++;}return {live:{code:live,etag:`live-${version}`},development:{code:dev,etag:`dev-${version}`}};},
  upload:f=>{events.push(`upload:${f.path}`);if(uploadFailure)throw Error('upload failed');},
  verifyAssets:async()=>{events.push('verified-assets');},
  stage:(code,etag)=>{assert.equal(etag,`dev-${version}`);events.push('stage:'+routeRelease(code));dev=code;version++;return `dev-${version}`;},
  test:async release=>{events.push('test');if(testFailure&&release===next)throw Error('development test failed');},
  publish:etag=>{assert.equal(etag,`dev-${version}`);events.push('publish');live=dev;},
  verifyPointer:async release=>{events.push('verify:'+release);if(concurrentAfterPublish&&release===next)live=routeCode('f'.repeat(64));assert.equal(routeRelease(live),release);if(postFailure&&release===next)throw Error('public verify failed');},
 };
 return {io,events,live:()=>routeRelease(live),dev:()=>routeRelease(dev)};
}
const ok=fake();const result=await publishFrontend(ok.io,manifest,'deploy');assert.equal(result.passed,true);assert.equal(ok.live(),next);assert.ok(ok.events.indexOf('verified-assets')<ok.events.indexOf('stage:'+next));
const skipped=await publishFrontend({},manifest,'rollback_drill');assert.equal(skipped.skipped,true);
const upload=fake({uploadFailure:true});await assert.rejects(()=>publishFrontend(upload.io,manifest,'deploy'),/upload failed/);assert.equal(upload.live(),old);assert.ok(!upload.events.some(x=>x.startsWith('stage:')));
const development=fake({testFailure:true});await assert.rejects(()=>publishFrontend(development.io,manifest,'deploy'),e=>e.frontendReport.recovery.restoredOld);assert.equal(development.dev(),old);assert.ok(!development.events.includes('publish'));
const failed=fake({postFailure:true});await assert.rejects(()=>publishFrontend(failed.io,manifest,'deploy'),e=>!e.frontendReport.passed&&e.frontendReport.recovery.restoredOld);assert.equal(failed.live(),old);assert.equal(failed.events.filter(x=>x==='publish').length,2);
const conflict=fake({concurrent:true});await assert.rejects(()=>publishFrontend(conflict.io,manifest,'deploy'),/changed during upload/);assert.equal(conflict.live(),'f'.repeat(64));assert.ok(!conflict.events.includes('publish'));
const afterConflict=fake({concurrentAfterPublish:true});await assert.rejects(()=>publishFrontend(afterConflict.io,manifest,'deploy'),e=>!e.frontendReport.recovery.restoredOld&&e.frontendReport.recovery.error.includes('Concurrent live change'));assert.equal(afterConflict.live(),'f'.repeat(64));assert.equal(afterConflict.events.filter(x=>x==='publish').length,1);
console.log('Frontend release checks passed: same-run approvals/backend identity, immutable metadata/paths, upload-before-publish, drill skip, development failure, old-pointer recovery and concurrent change refusal. No AWS calls.');
