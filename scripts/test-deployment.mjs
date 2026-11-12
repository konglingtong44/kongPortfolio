import assert from 'node:assert/strict';
import { appSpec, requireDeploymentContext, runDeployment } from './deployment-contract.mjs';
import { contracts } from './staging-contract.mjs';
const manifest={gitCommit:'a'.repeat(40),releaseId:'b'.repeat(64),backend:{sha256:'c'.repeat(64)}};
const execution={pipelineName:'kongportfolio-candidate',pipelineExecutionId:'run-1',artifactRevisions:[{name:'SourceRef',revisionId:manifest.gitCommit}]};
const actions=['Source','BuildCandidate','VerifyStaging','ApproveProduction','VerifyGreen','ApproveTrafficShift'].map(stageName=>({stageName,actionName:({ApproveProduction:'ApproveGreenCreation',VerifyGreen:'PublishAndVerifyGreen',ApproveTrafficShift:'ApproveBlueGreenDeployment'})[stageName]||'action',status:'Succeeded',actionExecutionId:'approval1'}));
const checks=contracts.map(c=>({name:c.label,status:'passed'}));
const staging={schemaVersion:1,kind:'staging-verification',passed:true,pipelineExecutionId:'run-1',gitCommit:manifest.gitCommit,releaseId:manifest.releaseId,backendSha256:manifest.backend.sha256,functionName:'kongportfolio-stg',functionVersion:'4',checks};
const green={...staging,kind:'production-green-verification',functionName:'kongportfolio-prod',approval1ActionId:'approval1',liveTrafficUnchanged:true,blueVersion:'2',greenVersion:'3',stagingVersion:'4',liveAliasRevisionId:'rev1'};
const blue={Name:'live',FunctionVersion:'2',RevisionId:'rev1'};
const validate=(a=actions,g=green,l=blue)=>requireDeploymentContext(execution,a,manifest,staging,g,'run-1',l);
validate();
assert.throws(()=>validate(actions.filter(a=>a.stageName!=='ApproveTrafficShift')),/approval 2/);
assert.throws(()=>validate(actions,{...green,pipelineExecutionId:'old-run'}));
assert.throws(()=>validate(actions,green,{...blue,RevisionId:'new-revision'}),/stale/);
assert.throws(()=>validate(actions,{...green,checks:[]}));
assert.throws(()=>appSpec('2','$LATEST'));

function fake({baseline=true,brokenHealth=false,brokenAfterSuccess=false,baselineFail=false,neverFinish=false}={}) {
  const created=[],stopped=[]; let active,version='2',weighted=false,registered=baseline,polls=0;
  const io={
    hasBaseline:()=>registered,
    create:(spec,config,description)=>{const id=`d-${created.length}`;const target=spec.Resources[0].Portfolio.Properties.TargetVersion; created.push({id,target,config,description});active=id;polls=0;return id;},
    get:id=>{
      const item=created.find(x=>x.id===id);
      let status='InProgress';
      if(stopped.includes(id)){version='2';weighted=false;status='Stopped';}
      else if(item.target==='2'&&baselineFail){status='Failed';}
      else if(!neverFinish&&polls>=1){version=item.target;registered=true;weighted=false;status='Succeeded';}
      else if(item.target==='3'){weighted=true;}
      return {applicationName:'kongportfolio',deploymentGroupName:'production',description:item.description,status};
    },
    alias:()=>({...blue,FunctionVersion:version,...(weighted?{RoutingConfig:{AdditionalVersionWeights:{'3':0.1}}}:{})}),
    health:async()=>{if((brokenHealth&&weighted)||(brokenAfterSuccess&&version==='3'))throw Error('HTTP 503');},
    stop:id=>{assert.equal(id,active);stopped.push(id);version='2';weighted=false;},sleep:async()=>{polls++;},
  };
  return {io,created,stopped};
}
const context={blue:'2',green:'3',executionId:'run-1'};
const success=fake({baseline:false});
const result=await runDeployment(success.io,context);
assert.equal(result.passed,true);assert.equal(result.greenVersion,'3');
assert.deepEqual(success.created.map(x=>x.target),['2','3']);
assert.equal(success.created[0].config,'CodeDeployDefault.LambdaAllAtOnce');
assert.equal(success.created[1].config,'CodeDeployDefault.LambdaCanary10Percent5Minutes');
const failed=fake({brokenHealth:true});
await assert.rejects(()=>runDeployment(failed.io,context),e=>e.message==='HTTP 503'&&e.deploymentReport.recovery.requested&&e.deploymentReport.recovery.verifiedBlue);
assert.equal(failed.stopped.length,1);
const lateFailure=fake({brokenAfterSuccess:true});
await assert.rejects(()=>runDeployment(lateFailure.io,context),e=>e.deploymentReport.recovery.verifiedBlue);
assert.deepEqual(lateFailure.created.map(x=>x.target),['3','2']);
const baselineFailure=fake({baseline:false,baselineFail:true});
await assert.rejects(()=>runDeployment(baselineFailure.io,context),/Failed/);
assert.deepEqual(baselineFailure.created.map(x=>x.target),['2']);
const timeout=fake({neverFinish:true});
await assert.rejects(()=>runDeployment(timeout.io,context),/timed out/);
assert.equal(timeout.stopped.length,1);
console.log('Deployment checks passed: fresh approvals/revision, baseline before canary, HTTP failure stop/recovery, failed baseline blocks traffic, bounded timeout. No AWS calls.');
