import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { digest,verifyCandidate } from './verify-pipeline-candidate.mjs';
import { frontendContext,publishFrontend,verifyRouterTest } from './frontend-release.mjs';

const account=process.env.FRONTEND_ACCOUNT_ID, executionId=process.env.FRONTEND_EXECUTION_ID, mode=process.env.FRONTEND_RELEASE_MODE;
assert.match(account||'',/^\d{12}$/); assert.match(executionId||'',/^[a-f0-9-]{36}$/);
for(const name of ['Candidate','StagingReport','GreenReport','DeploymentReport'])assert.ok(process.env[`CODEBUILD_SRC_DIR_${name}`]);
const candidate=resolve(process.env.CODEBUILD_SRC_DIR_Candidate), manifest=verifyCandidate(candidate);
assert.equal(manifest.gitCommit,process.env.FRONTEND_SOURCE_COMMIT);assert.equal(manifest.gitCommit,process.env.CODEBUILD_RESOLVED_SOURCE_VERSION);
const readReport=name=>JSON.parse(readFileSync(join(process.env[`CODEBUILD_SRC_DIR_${name}`],'report.json')));
const staging=readReport('StagingReport'),green=readReport('GreenReport'),deployment=readReport('DeploymentReport');
const out=resolve('.local/frontend-verification');mkdirSync(out,{recursive:true});
const fn='kongportfolio-prod-spa',bucket=`kongportfolio-site-${account}-ap-northeast-1`;
function aws(args,allowExists=false){
 const r=spawnSync('aws',[...args,'--region','ap-northeast-1','--output','json'],{encoding:'utf8',timeout:90_000,env:{...process.env,AWS_PAGER:'',PYTHONUTF8:'1'}});
 if(r.error)throw r.error;
 if(allowExists&&r.status!==0&&r.stderr.includes('(PreconditionFailed)'))return undefined;
 assert.equal(r.status,0,`AWS ${args[0]} ${args[1]} failed: ${r.stderr}`);
 return r.stdout.trim()?JSON.parse(r.stdout):{};
}
assert.equal(aws(['sts','get-caller-identity']).Account,account);
const execution=aws(['codepipeline','get-pipeline-execution','--pipeline-name','kongportfolio-candidate','--pipeline-execution-id',executionId]).pipelineExecution;
const actions=aws(['codepipeline','list-action-executions','--pipeline-name','kongportfolio-candidate','--filter',`pipelineExecutionId=${executionId}`]).actionExecutionDetails;
frontendContext(execution,actions,manifest,staging,green,deployment,executionId,mode);
let serial=0;
function readFunction(stage){
 const path=join(out,`router-${serial++}.js`);
 const meta=aws(['cloudfront','get-function','--name',fn,'--stage',stage,path]);
 const description=aws(['cloudfront','describe-function','--name',fn,'--stage',stage]);
 assert.equal(description.ETag,meta.ETag,'Function changed while reading snapshot');
 const config=description.FunctionSummary.FunctionConfig;
 assert.equal(config.Runtime,'cloudfront-js-2.0');assert.equal(config.KeyValueStoreAssociations?.Quantity||0,0);
 return {code:readFileSync(path,'utf8'),etag:meta.ETag,config};
}
async function request(path){
 const r=await fetch('https://konglingtong44.com'+path,{redirect:'error',signal:AbortSignal.timeout(30_000)});
 assert.equal(r.status,200,`HTTP failed: ${path}`);
 return {bytes:Buffer.from(await r.arrayBuffer()),headers:r.headers};
}
let savedConfig;
const io={
 snapshot:()=>{const live=readFunction('LIVE'),development=readFunction('DEVELOPMENT');savedConfig??=live.config;assert.deepEqual(development.config,savedConfig);assert.deepEqual(live.config,savedConfig);return {live,development};},
 upload:file=>{
  const source=join(candidate,'frontend',file.path);
  assert.equal(digest(readFileSync(source)),file.sha256);
  aws(['s3api','put-object','--bucket',bucket,'--key',file.key,'--body',source,'--if-none-match','*','--server-side-encryption','AES256','--checksum-algorithm','SHA256','--checksum-sha256',file.checksum,'--content-type',file.contentType,'--cache-control',file.cacheControl],true);
  const head=aws(['s3api','head-object','--bucket',bucket,'--key',file.key,'--checksum-mode','ENABLED']);
  assert.equal(head.ChecksumSHA256,file.checksum);assert.equal(head.ContentType,file.contentType);assert.equal(head.CacheControl,file.cacheControl);
 },
 verifyAssets:async()=>{
  for(const f of manifest.frontend){const r=await request(`/releases/${manifest.releaseId}/${f.path}`);assert.equal(digest(r.bytes),f.sha256,`Public immutable asset mismatch: ${f.path}`);}
 },
 stage:(code,etag)=>{
  const codeFile=join(out,'staged-router.js'),configFile=join(out,'router-config.json');
  writeFileSync(codeFile,code);writeFileSync(configFile,JSON.stringify(savedConfig));
  const result=aws(['cloudfront','update-function','--name',fn,'--if-match',etag,'--function-config',`file://${configFile}`,'--function-code',`fileb://${codeFile}`]);
  assert.ok(result.ETag);return result.ETag;
 },
 test:async(release,etag)=>{
  const cases=[['GET','/',`/releases/${release}/index.html`],['HEAD','/projects/one',`/releases/${release}/index.html`],['GET','/version.json',`/releases/${release}/version.json`],['GET','/api/health','/api/health'],['POST','/api/bedrock','/api/bedrock'],['GET','/assets/missing.js','/assets/missing.js'],['GET',`/releases/${release}/assets/missing.js`,`/releases/${release}/assets/missing.js`]];
  for(const [method,uri,expected]of cases){
   const path=join(out,'test-event.json');writeFileSync(path,JSON.stringify({version:'1.0',context:{eventType:'viewer-request'},viewer:{ip:'127.0.0.1'},request:{method,uri,querystring:{},headers:{host:{value:'konglingtong44.com'}},cookies:{}}}));
   const test=aws(['cloudfront','test-function','--name',fn,'--stage','DEVELOPMENT','--if-match',etag,'--event-object',`fileb://${path}`]).TestResult;
   verifyRouterTest(test,expected);
  }
 },
 publish:etag=>aws(['cloudfront','publish-function','--name',fn,'--if-match',etag]),
 verifyPointer:async release=>{
  const immutable=await request(`/releases/${release}/index.html`),expectedHTML=digest(immutable.bytes);
  let lastError;
  for(let n=0;n<24;n++){
   try{
    const v=JSON.parse((await request('/version.json')).bytes.toString());assert.equal(v.releaseId,release);
    if(release===manifest.releaseId){assert.equal(v.gitCommit,manifest.gitCommit);assert.equal(v.sourceDirty,false);}
    assert.equal(digest((await request('/')).bytes),expectedHTML);assert.equal(digest((await request('/projects/frontend-release-check')).bytes),expectedHTML);
    const health=await request('/api/health');assert.equal(JSON.parse(health.bytes.toString()).status,'UP');
    return;
   }catch(e){lastError=e;await sleep(10_000);}
  }
  throw new Error(`Published pointer verification timed out: ${lastError?.message}`);
 },
};
let report;
try{
 if(mode==='deploy'){
  const live=aws(['lambda','get-alias','--function-name','kongportfolio-prod','--name','live']);
  assert.equal(live.FunctionVersion,green.greenVersion);assert.equal(Object.keys(live.RoutingConfig?.AdditionalVersionWeights||{}).length,0);
  const config=aws(['lambda','get-function-configuration','--function-name','kongportfolio-prod','--qualifier',green.greenVersion]);
  assert.equal(config.CodeSha256,green.lambdaCodeSha256);
 }
 report=await publishFrontend(io,manifest,mode);
}catch(e){report=e.frontendReport||{passed:false,error:e.message};throw e;}
finally{writeFileSync(join(out,'report.json'),JSON.stringify({schemaVersion:1,kind:'frontend-publication',pipelineExecutionId:executionId,gitCommit:manifest.gitCommit,releaseId:manifest.releaseId,mode,...report},null,2)+'\n');}
console.log(`Frontend ${report.skipped?'skipped for rollback drill':'publication verified'}: ${manifest.releaseId}`);
