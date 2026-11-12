# S1-01T — timeline and resume reconciliation

## S3-08 — CloudFront response fix verified; fresh gate1 (2026-11-12)

Source7a2e1b8 published, both AWS CI and GitHub statuses success. New execution5d55596a/v6/deploy Candidate7a6ca25a and STGf9e341e0 succeeded; STG9 seven checks pass. Versioned report outer SHA/source/release/backend immutable code and approval exports independently match. Release242f8cb4…. Waiting new ApproveProduction; old2a56d7b1 remainsFailed with healthy backend7/old frontend retained. No new TF/IAM resources or new frontend LIVE publication; require both fresh human gates, no old approval reuse. Root log24 includes failed first attempt, actual AWS wrapper fixture and recovery evidence.

## S3-08 — Backend7 succeeded; CloudFront test parser fix (2026-11-12)

2a56d7b1 backend canary d-42C5RN2EM Succeeded/live7/no weights. Frontend3363d605 uploaded and publicly verified six immutable files but failed before LIVE publish: AWS TestFunction wraps output in request, original code read top-level uri. Actual old LIVE/DEV restored/unchanged, failed report passed=false/recovery.restoredOld=true; whole pipeline Failed. Fixed strict parser to request.uri, added real-response and negative tests plus AWS sample replay, pass; no IAM/TF expansion. Fresh fixed-source execution requires both new gates. Root log24 includes failure and recovery evidence.

## S3-08 — Green verified; full-stack gate2 pending (2026-11-12)

User completed gate1 for2a56d7b1/c073e19/deploy. Green buildfde496b6 Succeeded; immutable Green7/STG8 same release0dfbd044…, seven checks pass. Versioned report/outer SHA/approval identity/source/code/exports independently matched actual Lambda; live remainsBlue5/unchangedRevisionId/no weights, old frontend a594e36…, healthUP. ApproveTrafficShift InProgress; gate2 authorizes normal backend10%/5min/full then same-candidate React S3/CloudFront publication/recovery. No frontend upload or pointer change yet; cloud publication/recovery still unverified. Root log23.

## S3-08 — Frontend publication infrastructure applied (2026-11-12)

Reached gate1: execution2a56d7b1/v6/deploy, Source/Candidate/STG succeeded atc073e19; STGv8 seven checks pass. Downloaded exact StagingReport version and matched outer CodeBuild SHA/source/release/backend code/approval exports against immutable Lambda. Release0dfbd044…. ApproveProduction waiting user, live backend5/no weights, old frontend a594e36…/healthUP. No site upload/router publication yet. Gate2 now authorizes backend promotion then same-candidate frontend publication/recovery. Root log22.3.

User approved4create/2update/code-pointer ownership handoff. Actual apply4add/2change/0destroy; post-plan No changes. Actual pipelinev6/QUEUED has8stages, both human gates and backend deployment precede frontend5-input stage; independent project15min/concurrency1, role mutation boundaries verified. New execution2a56d7b1 pinnedc073e19/ReleaseMode deploy started; validating to gate1, no static upload/router switch yet. Live backend5, old frontend a594e36… unchanged. Root log22.

## S3-08 — Frontend automatic publication preparation (2026-11-12, awaiting approval)

Sourceb00264a published, both existing AWS CI builds and GitHub statuses success; frontend40 tests/build, backend9+3 tests/ZIP smoke, frontend publication guards tested on AWS Linux. Local prefixed Vite build confirms HTML/CSS/JS/public image URLs. No apply/site upload/router update or new candidate execution; final docs evidence local only pending explicit4-create/2-update and CloudFront code-pointer ownership approval.

Prepared optional eighth pipeline stage after successful backend deployment, same candidate/five report inputs and both human gates; rollback_drill skips frontend. Immutable conditional S3 uploads with checksum/MIME/cache validation, public asset verification, ETag-protected CloudFront DEVELOPMENT tests then LIVE pointer publish, bounded public identity/HTML/API checks and old-pointer recovery on failure. Separate restricted role cannot delete objects/update distribution/backend alias/approve. Actual plan4 create/2 update/0 delete; disabled and production code-ownership handoff plans No changes. Terraform continues runtime/distribution ownership, pipeline owns router code prefix.19 CICD+3 domain mocked plans and Node failure/concurrency/context tests pass; AWS upload/TestFunction/propagation/recovery unverified. No frontend apply/upload/publish yet. docs/frontend-publication.md; root log21.

## S3-07R — Controlled stop and automatic rollback verified (2026-11-12)

User completed both gates for96861976/8ad190b/rollback_drill. Blue5-only baseline d-CRSIZL0EM Succeeded; canary d-2OPWFF0EM observed Green6 at10%, then Stopped/MANUAL_STOP as intended. AWS automatic rollback d-M40WD11EM Succeeded with bidirectional triggering-deployment links; actual live5/no weights and immutable stable code unchanged. Report outer SHA/source/mode/outcome/observations/recovery IDs independently matched AWS. Controller8a900c73 and whole pipeline Succeeded. Seven restored public HTTPS contracts pass, alarmOK, production/CICD plans No changes. This verifies stop-on-request automatic rollback, not independently app-failure/alarm-trigger scenarios. No bad code, alarm-state manipulation, extra manual recovery or direct alias update. Root log20, concise docs/rollback-drill.md; pause for review before frontend publishing increment.

## S3-07R — Drill Green verified; waiting gate2 (2026-11-12)

User completed gate1 for96861976 / ReleaseMode rollback_drill. Green builda562a361 at8ad190b Succeeded; Green6/STG7 same release13d4d232…, seven contracts pass. Downloaded exact report version and matched outer SHA, same-run approval/STG/code identity, immutable qualifier6 SHA and approval exports. Live remainsBlue5/unchangedRevisionId/no weights/healthUP. ApproveTrafficShift InProgress; no drill deployment yet. Next user approval explicitly permits stop-at-10% and verify automatic restoration toBlue5, not full promotion. Real rollback still unverified; root log19.

## S3-07R — Controlled rollback drill preparation (2026-11-12)

Reached gate1: execution96861976/v5/ReleaseMode rollback_drill has Source/Candidate/STG Succeeded, STGv7 seven contracts pass. Exact StagingReport object version/outer SHA/source/release/backend code and approval exports independently match actual Lambda. Release13d4d232…. Live remains5/no weights/healthUP; no stop or rollback performed yet. Await both fresh human gates. Root log18.5.

Source8ad190b AWS frontend/backend CI and GitHub statuses success (40 frontend tests/build, 9+3 backend tests/ZIP smoke, drill logic tested on AWS Linux). Applied only existing pipeline update: 0 add/1 update/0 destroy, post-plan No changes. Pipelinev5/new execution96861976 pinned8ad190b resolves ReleaseMode=rollback_drill. GetPipelineExecution initial eventual-consistency not-found resolved on read-only retry; no duplicate start. Validating to human gate1, no production drill yet; live remains5.

Prepared explicit execution-bound ReleaseMode (deploy default / rollback_drill). Drill stops only after observed 10% canary, requires AWS automatic rollback ID/Succeeded plus restored Blue/no weights/public health to pass; missing/failed rollback cannot be replaced by a manual deployment and called success. Both human gates retained, gate2 exposes mode. Actual plan 0 add / 1 pipeline update / 0 delete, no IAM expansion; existing resources reused. Node negative/failure/stop drill tests and 16 Terraform mocked plans pass. Cloud rollback and alarm-trigger testing remain unverified; this increment tests stop-on-request path, not induced application failure or alarm state. docs/rollback-drill.md, root log18.

## S3-07 — First real canary succeeded (2026-11-12; rollback drill pending)

User completed both approvals for 98380c85 / c0a0a2c. Controller 0a1ce867 and CodeDeploy d-K1QJSA0EM Succeeded; whole pipeline Succeeded. Independently observed live Blue2 with Green5 weight0.1, then live5/no weights. Downloaded exact DeploymentReport object version; outer SHA, approved source/release/versions/deployment ID and 15 observations (including canary/final success) match AWS. Actual live5 code equals approved Green SHA. Seven public HTTPS contracts pass; alarm OK, no rollback triggered. Production and CICD post-cutover plans No changes. Baseline fix validated in real run, no duplicate baseline created. Real failure/alarm rollback drill remains unverified; no frontend promotion/real Bedrock. Audit root log section17; concise current state docs/codedeploy-next-story.md. Pause for review of this runnable cutover increment.

## S3-07 — Fixed execution Green verified; gate 2 pending (2026-11-12)

User completed gate 1 for 98380c85. Green build a9b6d691 at c0a0a2c Succeeded; production Green v5 passed seven contracts, STG v6 same release a578af2e…. Downloaded versioned report; outer SHA, same-run approval/artifact identity, immutable Green code, exports and unchanged Blue v2 alias/RevisionId/weights all verified. Health UP. ApproveTrafficShift InProgress: user must approve Blue2→Green5 actual CodeDeploy canary; no agent approval. Existing baseline digest fix has actual metadata verification; real canary/rollback remain unverified. Audit section16.

## S3-07 — Baseline digest fix verified; fresh gate 1 (2026-11-12)

Fix c0a0a2c published; both AWS CI and GitHub statuses success. New execution 98380c85 Candidate 98206404 and STG 4ad476f1 succeeded at same SHA; STG v6 passed seven contracts. Downloaded exact StagingReport object version; outer SHA/code/source/execution/approval exports match actual Lambda. Release a578af2edc0269822612dce35ff921efbc4595f33552999bdf5c40a57da13fe8. Waiting new ApproveProduction/ApproveGreenCreation, no reuse of old approvals. Live still v2/no weights/health UP. Existing Blue baseline d-0XJZB7ZDM remains succeeded; actual canary/rollback pending. Root log section15 includes failed prior run and fix.

## S3-07 — First Blue baseline succeeded; digest response fix (2026-11-12)

User completed gate 2 for f2ed11c5. Real CodeDeploy Blue2→Blue2 baseline d-0XJZB7ZDM Succeeded, but build e67ebb2b failed closed before creating canary: GetDeployment omits AppSpec content and returns only SHA256, so the original parser rejected its valid baseline. Live remains v2/no weights, health UP. Fixed baseline verification to compare exact generated Blue-only AppSpec hash plus succeeded/app/group/type; added digest-only actual-response fixture and negative tests, all pass. No Terraform/IAM changes. Start fresh pinned-source execution and require both new human gates; old execution remains Failed, actual canary/rollback unverified. Audit section15.

## S3-07 — Fresh Green verified, waiting real traffic approval (2026-11-12)

User completed approval 1 for f2ed11c5 / ff77d62. Green build 1010d2da succeeded, production published Green v4 passed seven contracts; same release as STG5 (6af4a796…). Downloaded exact GreenReport version and verified outer SHA, source/execution/STG/release/code, approval 1 identity, actual Green SHA and gate 2 exported variables. Live still Blue v2 with unchanged RevisionId/no weights, health UP; production Terraform plan No changes after publication. CodeDeploy deployments empty; ApproveTrafficShift InProgress. This gate now explicitly authorizes real CodeDeploy 10%/5min traffic shift then 100% and recovery; first Blue baseline acceptance and real rollout/rollback remain unverified until user gate 2 approval. Full audit root log section14.

## S3-07 — CodeDeploy infrastructure applied (2026-11-12, validating to gate 1)

Reached fresh human gate 1: Candidate and STG succeeded for ff77d62; STG v5 passed seven contracts. Downloaded exact versioned report; outer CodeBuild SHA, execution/source/release/backend SHA, immutable Lambda and approval exports match. Release 6af4a796faf697721d69148c95d9e81cd96abc2a0bf15e29b09de1eddc3d5910. Execution f2ed11c5 InProgress at ApproveProduction, no agent approval; no CodeDeploy deployments yet. Production live v2/no weights, health UP; error alarm now OK. Real canary/rollback remain pending both human gates.

User explicitly approved creation: apply 9 add / 2 change / 0 destroy, post-apply plan No changes. Actual Lambda CodeDeploy group has 10%/5min, alarms fail closed and three rollback events; pipeline v4 has seven stages with two Manual gates before deployment. New execution f2ed11c5 pinned to ff77d62 started; no CodeDeploy deployment yet, live v2/no weights, public health UP. Real first baseline/canary/rollback remain unverified until both fresh human approvals. Audit root log section 13.

## S3-07 — CodeDeploy preparation (2026-11-12, awaiting paid-resource approval)

Source 0add5d0 published; both existing AWS CI builds and GitHub statuses success, applicationChecksRan=true. Frontend 40 tests/build; backend 9+3 tests/ZIP smoke; injected deployment guards run on AWS Linux. No deployment resources or traffic changes applied. Final evidence recorded locally pending explicit 9-create/2-update approval.

Prepared opt-in seven-stage pipeline: deployment follows both same-run human gates, verifies candidate/STG/Green/report/live snapshot, seeds a verified Blue baseline before first canary, observes 10% for five minutes then full Green, checks public health/profile and requests CodeDeploy rollback on failures. CodeBuild has no direct alias/code-write/approval rights. Actual plan 9 create / 2 update / 0 delete; default disabled plan No changes. Terraform 16 mocked plans and injected Node success/failure/timeout/recovery guards pass. No apply/create-deployment/traffic shift; actual IAM/baseline acceptance/alarm/rollback remain cloud gaps. docs/codedeploy-next-story.md; audit root log section 12.

## S3-06 — Completed after human approval 2 (2026-11-12)

AWS confirms ApproveTrafficShift Succeeded (review b9f9288a-dbc4-4019-85ea-9cb95c304d20); execution c02bc4e6 / pipeline v3 Succeeded. Both approvals were performed by the user. Live remains Blue v2/no weights, verified Green v3 retained, public health UP. This completes the Green/two-gate validation Story, with no traffic deployment stage. Next Story scope in docs/codedeploy-next-story.md; CodeDeploy/real cutover/rollback are not implemented, and old approvals must not authorize a new candidate or amended pipeline execution. Audit root log section 11.

## S3-06 — Production Green verified (2026-11-12, waiting human gate 2)

User completed approval 1 in AWS for c02bc4e6 / source 776e24f. Green build f3a7e052 succeeded, production published version 3 passed seven direct-invoke contracts; downloaded versioned GreenReport and matched outer SHA, same-run approval/STG/release/code identity, actual immutable Lambda SHA and approval exports. Live remains Blue v2 with unchanged RevisionId/no weights; public health UP; production Terraform plan No changes after Green publication. ApproveTrafficShift/ApproveBlueGreenDeployment InProgress; no agent approval, no traffic stage exists yet. Direct Green invocation is not API Gateway/CloudFront E2E. CodeDeploy traffic shifting/rollback, frontend promotion and bounded Bedrock remain later Stories. Full operation audit root log section 10.

## S3-06 — Production Green preparation (2026-11-12, awaiting approval)

User subsequently approved: 4 creates / 2 updates / 0 deletes applied, post-apply plan No changes. Actual six-stage pipeline version 3 has both Manual gates; Green role lacks routing/config/approval operations. New pinned-source execution c02bc4e6 at 776e24f started, waiting for fresh STG and human gate 1. No production Green version or traffic update yet.

Cloud verification now at human gate 1: Candidate and STG succeeded, STG published version 4 passed all seven contracts. Downloaded exact report object version; CodeBuild outer SHA, source/execution/release/backend SHA, immutable Lambda code and approval exports match. Release 07ad6c1f23a3abdeb6332719ba846aa81f101db71a786a8681827b797eaa3d5b. Overall execution InProgress at ApproveProduction; Green/approval 2 not run. Production live remains v2/no weights, health UP; post-STG CICD plan No changes. Await user UI approval; never approved by agent.

Source 18cf862 published; both existing AWS CI builds and GitHub statuses success, frontend 40 tests/build, backend 9+3 tests/ZIP smoke. CICD 13 mocked plans, production 3 domain plans and Green guards passed. Final documentation evidence committed locally; no extra documentation-only CI push.

Old execution 1222a3dd is now Succeeded after the user's manual approval; it contained no Green action. Prepared opt-in production version publication and seven direct-invoke checks between two human gates. Fresh source/execution needs a fresh approval 1. Actual CICD plan: 4 create / 2 update / 0 delete; disabled plan and production ownership-handoff plan: No changes. Production code and alias release fields explicitly move to pipeline/later CodeDeploy ownership to avoid accidental Terraform routing. No Green apply, production version publication or traffic shift yet. CodeDeploy/rollback/frontend promotion remain later increments. See docs/green-approval.md and root log section 8 for commands, tests and cloud gaps.

## S3-05 — STG and first approval verified (2026-11-12, completed to human gate)

Approved 8 creates / 2 updates applied; verified bootstrap checksum before apply. Initial STG code update succeeded but v2 waiter required GetFunction; changed to configuration-only waiter without IAM expansion. Execution 1222a3dd-3302-4943-b992-8f9f2d2c087e at 4d12091 has Source/BuildCandidate/VerifyStaging succeeded, Approval 1 InProgress (pending), never approved by agent. STG version 3 passed seven real Lambda contracts and static candidate integrity. Downloaded versioned StagingReport; source/release/code/version agree with published function and approval exported variables. Release f784feab86d0ef506f6d6678e58c8cff43210343bf882c22e29d7182dc11c10a. Final plan No changes, production live v2/no weights/HTTPS health UP. Direct invoke only, no STG browser/API Gateway E2E. No production Green/approval 2/CodeDeploy yet. Full non-AWS/AWS audit in root log section 7. Story complete; pause for human review and next deployment increment.

## S3-05 — STG verification and first approval preparation (awaiting paid-resource approval)

Prepared isolated STG Lambda plus multi-artifact verifier and human approval 1 after verification. Actual plan 8 create / 2 update / 0 delete; default-off no changes. No apply. Direct version-qualified IAM Lambda invocation and static artifact integrity, no separate STG website/HTTP API/browser E2E. Terraform owns STG config, CI owns code explicitly. Verifier cannot change production/configuration or approve itself. StagingReport preserves source/release/code/version identities; gate displays release/version. Ten mocked Terraform plans and local Node failure-path tests pass. Real STG/multi-artifact/approval validation pending approval and cloud run. All operation categories now recorded in root log section 6, not just AWS. See docs/staging-approval.md.

Published 17f55f9; existing frontend and backend AWS CI plus both GitHub statuses success. Linux runs include STG unit checks, frontend 40 tests/build and backend 9+3 tests/ZIP smoke (applicationChecksRan=true). Final verification notes committed locally for the next authorized execution. Await explicit paid-resource approval; no STG/gate runtime claim yet.
## S3-04 — Candidate pipeline cloud verification (2026-11-12, completed)

Approved 14 resources created. Fixed actual 20-character artifact prefix in two role policies/lifecycle (0 add / 3 update / 0 delete) and global buildspec CI env. Successful execution e7b0712d-6cbb-4046-92a7-ce4a26fb98f9, CodeBuild 82d6bdee-9a94-41b7-bfd5-ca7690a81ce9, commit 4d00463. Full clone, frontend 40 tests/build, backend 9+3 tests/ZIP smoke and package/upload pass. Downloaded exact S3 object version, outer CodeBuild SHA and complete candidate manifest checks pass. Release f6c6341fa32de2315789c757d9b563f5a04d9ec6cd7a3c7b93361a0728337a2e. Actual object uses AWS-managed KMS; no customer key. Final plan No changes. Seven Terraform tests pass; log includes both failed runs and corrections. No STG/production/deployment gates or traffic changes. Candidate-only Story complete; pause for review before STG/approval/deployment increment.

## S3-04 — CodePipeline candidate preparation (awaiting paid-resource approval)

Approval received in the next turn; 14 resources created. Initial CreatePipeline execution failed in Source due to artifact prefix truncation. Corrected only two S3 role scopes and lifecycle filter to actual `kongportfolio-candid/`; seven tests passed. Cloud execution/artifact verification underway; follow root execution log section 5.

Prepared opt-in manual V2 Source → BuildCandidate pipeline, separate artifact bucket/project/roles, clean source candidate manifest v2 and checksum/path verifier. Actual plan reviewed: 14 create / 0 update / 0 delete; default-off plan no changes. Full-clone reference, 15-minute small build, seven-day logs and 30-day candidate expiration. No production/STG/deployment stages or new AWS resources applied. Two production approval gates remain required in the later deployment order. See docs/candidate-pipeline.md and root execution log. Local packaging validation and cloud gap are recorded below as completed; cloud run requires explicit approval.

Local clean-source validation at 37237d4 passed full ci.sh all: frontend 40 tests/build; backend 9 HTTP + 3 Lambda tests/ZIP/JVM smoke; real candidate packager/verifier. Seven Terraform mocked plans, integrity tamper/path tests, format/validate and secret/path checks passed. Candidate releaseId 9aa8d398127a78fe06decc4f36b13434cae0d0f758cf0069781cbf9e38af029a, ignored local output only. IAM Source permission includes required new/legacy UseConnection prefixes; final exact plan regenerated. AWS candidate pipeline/roles/bucket/upload not yet created or verified. Prepared for explicit paid-resource approval.

Source published at 6a225b5; both existing AWS CI jobs and GitHub statuses success (frontend 7668eb7a-3026-42f6-8239-802694c2776f, backend 9d687005-8a2d-4e97-90dd-885cfad571c2). Final verification notes committed locally, not repushed solely to avoid another documentation-triggered CI pair. Pause for approval of the concrete 14-create plan and initial candidate pipeline run.

## S3-03 — Automatic CI triggers and status writeback (2026-11-12, completed)

Owner subsequently accepted the actual pending GitHub App permission request (repository restricted to kongPortfolio). Rechecked two-create-only plan; both webhooks created successfully, 2 add / 0 change / 0 destroy. No IAM expansion. Final Terraform plan No changes.

Pushed e3836738037a411c2f75435dfd065dc69b5ffb55; both builds show GitHub-Hookshot initiator and matching source revision, with no manual start-build. Frontend 2afb920b-f930-451d-9e0f-78e87c025dad: SUCCEEDED, 40 tests/build/package, 41.6 s. Backend e009d765-916b-475c-8b62-67b424b2dc20: SUCCEEDED, 9 HTTP + 3 Lambda tests/ZIP smoke, 82.6 s. GitHub combined status success, ci/frontend and ci/backend both success. Approximately 3 rounded wall-time minutes / USD0.015 compute before allowance for this validation pair, logs/tax extra; not a bill. Five Terraform plan tests and actual AWS filter/account/log checks passed. PR created/reopened filters are configured but were not live-tested; branch protection and production deployment remain untouched. Root AWS_EXECUTION_LOG.md records execution. Story complete; pause for review before CodePipeline/two production approval gates/blue-green.

Prepared owner-only anchored push/PR filters and five offline plan tests. SSO renewed and account verified. Two-webhook-only apply failed with OAuthProviderException (GitHub API limit or permissions). Added a Terraform-managed account/region default reference to the same existing connection after verifying no previous GitHub credential entry; reference created, but both webhooks still failed. No IAM expansion, website change or new build. Root AWS_EXECUTION_LOG.md records commands, results, historical recap and the failed hypothesis. Awaiting owner review of GitHub App repository/new webhook permissions per AWS documentation. No automatic-trigger/status success claim; Story remains incomplete.

## S3-02 — First AWS CI execution (2026-11-12, completed)

User explicitly approved eight resources and initial frontend/backend builds. Persisted enable_ci=true in ignored local inputs. Rechecked exact eight-create plan, applied all eight resources; backend project initial OAuth error resolved by retrying only the missing project without permission changes. Final normal Terraform plan No changes. Published scanned source on feat/aws-serverless-ci; main and production remain unchanged.

First two builds at 8f4f7f3 failed because Windows-created hooks lacked executable Git mode. Fixed both hooks to 100755 and added index-mode checks. Retry builds pinned to 00b64d9972bb9e6d34b6c1698791026849abd167 both SUCCEEDED: frontend 40 tests, production build, clean verification bundle; backend 9 HTTP + 3 Lambda tests, ZIP assembly and ZIP-only JVM smoke. Both ran all application checks. AWS build IDs: frontend 16ecf0db-bd4d-4abb-9acd-5d34330a9dc5 (38.7 s), backend 553f9286-9ca9-4cf2-87bc-81c37d331259 (78.5 s). Including initial failures, four wall-clock durations round to approximately five minutes / USD0.025 compute before free allowance, not an invoice; logs/taxes additional.

Verified actual runtime, clone, IAM/log boundaries and no webhooks. Public GitHub status/check APIs returned zero entries despite report_build_status=true; status writeback is not verified and must be resolved before required PR checks. No automatic trigger/release, main merge, blue/green, real Bedrock or production deployment. Story complete; pause for review before automatic CI/CodePipeline increment. Full execution details in docs/aws-ci.md; raw logs/results remain ignored under .local.

## S3-02 — Bounded CodeBuild CI preparation (2026-11-12, awaiting paid-resource approval)

Prepared `infra/terraform/cicd/build.tf` and `docs/aws-ci.md`: opt-in frontend/backend CodeBuild projects, separate source-and-own-logs-only roles, seven-day logs, small Linux on-demand, concurrency one per project, 15-minute timeout, no auto retry/privileged Docker/webhooks/deployment/artifact storage. Saved actual plan `ci.tfplan`: 8 add / 0 change / 0 destroy. Existing default-off plan No changes. Nothing applied; no AWS builds started, no commit/push.

Verified Terraform fmt/validate and two mocked plans for default-off behavior, permissions and cost controls; actual saved-plan scope/limits; Bash syntax; frontend 40 tests/build; default backend 9 tests; Lambda 3 tests/ZIP and packaged JVM smoke; 28 hook checks, 12 routing cases, Gitleaks and diff whitespace. Full Linux CodeBuild execution, GitHub clone/status permissions and first-build duration remain unverified. Current source is not yet published. Removed unused CI artifact/cache declarations to match NO_ARTIFACTS projects.

Tokyo price verified against AWS catalog: $0.005/minute, 100 shared small-build minutes/month free. Example 20 pairs at 5 minutes each component: 200 minutes, $1 before allowance / $0.50 with 100 minutes remaining, plus logs/tax. Initial pair at 15-minute limits is approximately $0.15 compute before allowance. Review concrete scope and cost before creation and initial runs, per paid-resource agreement. After approval persist enable_ci=true locally, recheck/apply plan, publish scanned reviewed source and run both projects pinned to full commit SHA. No automatic release or blue/green claim.

## S3-01 — AWS GitHub source connection (2026-11-12, completed)

Owner completed GitHub OAuth; live AWS CLI readiness check reports AVAILABLE. Terraform refresh-only apply records the authorization status without changing AWS resources; subsequent normal plan No changes. Source connection Story complete. Repository clone/build remains unverified and no CodeBuild/pipeline/webhook exists yet.

Acceptance: Terraform-managed GitHub connection in Tokyo; separate S3 state key and account restriction; read-only readiness guard; owner completes GitHub OAuth. Created exactly one CodeConnection `kongportfolio-github`, no application changes or build/pipeline/webhook resources. ARN suffix `ff3ddf98-05c3-41fa-8bfe-f738a90df1d6`, status PENDING. GitHub main remains the earlier baseline; current deployment/CI changes have not been committed or pushed.

Terraform fmt/validate, saved one-create plan and guarded apply passed; post-apply plan No changes. PowerShell syntax, real PENDING rejection, wrong-account rejection before AWS call, 28 hook checks and Gitleaks passed. No application code changed, so frontend/backend tests were not rerun. This is not a working CI/CD or blue/green deployment yet. Owner action: complete the existing pending connection with repository-only access. Next Story: approved bounded CodeBuild CI and its first real source/build checks, followed by CodePipeline/two approval gates and Lambda CodeDeploy traffic shift/rollback. See `infra/terraform/cicd/README.md`. Pause for OAuth and review.

## S2-04D — Custom domain registration and binding (2026-11-12, completed)

User requested existing konglingtong44.com name. Confirmed hosted zone survives but registration expired in 2024. User chose one-year re-registration at quoted USD16 and supplied real contact data. Registration SUCCESSFUL, expiry 2027-11-11 Tokyo, auto-renew false, privacy true, contact reachability DONE. Contacts/request remain only under ignored .local, never repository/frontend.

Restored registrar NS to original zone; Google/Cloudflare public delegation verified. Strictly verified and removed only the automatic new empty zone. Terraform domain apply: 5 add / 1 update / 0 delete (planned S3 policy update evaluated identical); free non-exportable us-east-1 ACM, verification and A/AAAA aliases, original CloudFront now Deployed. Existing testec2 preserved. Three offline plan tests and real delegation guard pass. Live custom-domain HTTPS, valid TLS/SAN, HTTP→HTTPS, SPA/assets/version, 3 languages, health/POST/error/cache checks pass. Final plan No changes. Original CloudFront URL still works; no app/code deployment, no new Bedrock/CI resources, no browser visual retest, commit or push. See docs/custom-domain.md. Story complete; pause for review.

## S2-04 — First AWS deployment completed (2026-11-11)

User approved concrete 23-create plan and frontend candidate. Created 23 resources and uploaded six immutable frontend files; CloudFront https://d4htln25bw5g5.cloudfront.net is Deployed. Initial health exposed read-only /var/task disk indicator; Terraform now sets diskspace=/tmp, publishing live version 2 (0 add / 2 update / 0 delete), same approved ZIP. Removed redundant empty S3 origin block to eliminate OAC plan drift. Final plan exited 0 / No changes.

Live HTTPS smoke passed HTML/assets/version, three-language profile, UP health, POST PREPARING, no-store API and genuine API/asset errors. SPA deep link 200, anonymous S3 index 403; S3 security settings, logs-only execution role, Lambda ZIP checksum and idempotent upload verified. Computer Use stopped because browser URL could not be established; no visual/mobile/interaction claim. No real Bedrock, CI/CD/blue-green/custom domain, commit or push. Details: `infra/terraform/portfolio/DEPLOYMENT.md`. Story complete; pause for review.

## S2-04 — First serverless deployment preparation (2026-11-11)

Acceptance: runnable Terraform for Lambda/HTTP API/private S3/CloudFront, isolated remote state, immutable explicit build candidate, real account plan and artifact/routing safeguards; paid creation requires review. Prepared 23 creates / 0 updates / 0 deletes, no apply. Java 21 1 GB / 28 s / reserved concurrency 5; HTTP API 1 rps/burst 5; 7-day logs; logs-only execution role; default CloudFront HTTPS domain, no DNS change.

Lambda 3 tests/ZIP smoke, frontend 40 tests/typecheck/versioned build and 12 routing cases passed. Real fmt/validate/plan review passed; tampered frontend copy rejected by Terraform and the offline pre-apply guard. Offline publisher verifies skip-existing/create-only/checksum/wrong-account behavior. Current working-tree candidate honestly records sourceDirty and content snapshot hashes. No live function/upload/CloudFront/cold-start validation; no Bedrock/CI/CD/blue-green resources or commit/push. See `infra/terraform/portfolio/README.md`. Pause for explicit approval of the concrete plan and candidate before creating paid resources.

## S2-03 — Spring Boot Lambda adaptation (2026-11-11)

User selected Lambda + API Gateway HTTP API + S3/CloudFront, AWS-only CI/CD and blue/green, followed by bounded Bedrock Q&A. Acceptance: retain local HTTP/Compose; isolated Lambda build and HTTP API v2 entry point; test language/fallback, health, POST placeholder, 404/405, warm invocations and private query omission; validate the actual ZIP independently.

Implemented Maven lambda profile with pinned AWS Spring Boot 4 adapter 3.0.5, console-only Lambda logging, lib-JAR ZIP and CI checks. Verified frontend 40 tests/build; default backend 9 tests/executable JAR; Lambda 3 tests/ZIP; ZIP-only JVM smoke (24.1 MiB compressed / 26.8 MiB libraries); 27 hook checks and secret/diff checks. Local tests explicitly disable unrelated host DEBUG variable. No Docker image rebuild or actual AWS runtime/cold-start check. No AWS writes, commit or push. Current plan: `docs/serverless-plan.md`; old ECS docs marked historical. Pause for review before first-deployment Terraform Story.

## S2-01 — Terraform State bootstrap (2026-11-11)

Approved and completed: Tokyo S3 state bucket with private access, SSE-S3, versioning, ACL disabled and HTTPS policy; local state migrated to S3 with native locking. Apply: 6 add / 0 change / 0 destroy. Post-migration and post-lock-test plans: no changes. Real concurrent lock rejection and release verified; 27 hook checks, fmt/validate and configuration secret scan passed. See `infra/terraform/EXECUTION.md`. No application changes, no application/container checks rerun, no commit/push. Budget and website resources remain uncreated. Pause for review.

## S2-02 — AWS deployment preflight (2026-11-11)

Completed read-only inventory via `scripts/aws-preflight.ps1`: two existing account-wide email Budgets discovered, so no duplicate created; one public hosted zone; no certificates in Tokyo/us-east-1; no queried CloudFront distributions or Tokyo ECS clusters/ECR repositories/load balancers. Full real query and wrong-account rejection verified; local report excludes subscriber addresses. See `docs/aws-preflight.md` for alert rules and gaps. No AWS writes, application changes or commit/push. Deployment scope selection pending; pause for review.

Acceptance: large Stardew-inspired 03 button; synchronized vertical timeline on the left and horizontal cards on the right; selecting a timeline entry scrolls before opening its detail; cancel pending opens on interruption; 01 ↔ 02 ↔ 03 navigation survives manual scrolling and fractional alignment; richer source-backed project detail; technology-based Bento categories.

Content: 7 professional projects, 1 personal project, 8 career/education timeline records, 12 technology categories plus a separate website-technology card. Professional periods follow the October 2026 PDF; the April XLS supplies supporting scope/tools. Contact, address, birthday and customer/internal-project identifiers excluded.

Checks: production frontend build; 28 frontend tests; 5 backend HTTP tests; live API count/content check; Gitleaks and Compose configuration passed. Desktop verification through the existing VS Code preview confirms 01 → 02, 02 first item → 01, the left timeline, scroll-then-open project details, and button layout. Also verified: large button → 03, upward wheel → 02 retaining the selected project, and subsequent horizontal wheel navigation with synchronized timeline. Mobile/touch and container images remain unverified.


Pause for review. No AWS changes. Roadmap remains local → approved first AWS deployment → AWS-native CI/CD → blue/green; no GitHub Actions. Bedrock remains a placeholder.

## S1-01L — compact toolkit layout

Acceptance: complete rows with equal-width category cards; compact title/icon headers; website technology and qualifications paired below; 3/2/1 responsive columns; retain all source-backed content and open qualifications. Implemented in isolated `frontend/src/skills.css`. Build and 28 existing frontend tests passed; desktop category grid inspected in the live VS Code preview. Footer pair and mobile layout were not visually checked because user input interrupted the window session. No backend changes. Ready for layout review.

## S1-01I — introduction milestones and explicit return

Acceptance: recompose 01 with introduction on the left and a vertical education/employment timeline on the right; supplied dates, university/faculty/major and anonymous A-China/A-Japan/B labels in ja/zh/en; add a visible wood-style 02 → 01 button; retain the rest of the site. Implemented. Build, 32 frontend tests and Gitleaks passed. Desktop preview visually confirms all four milestones fit a short desktop viewport. Return-button behavior is covered by a test; native element-click verification was unavailable due to UI geometry. Mobile visual review remains pending. No backend change.

## S1-01F — readable introduction and live preview content

Acceptance: shorten the three introductions; do not intercept 01 wheel scrolling until the introduction bottom is visible; show the current source copy in the running review API. Implemented. Japanese introduction is 243 characters. Local-only `portfolio.content-directory` enables per-request public JSON loading; packaged/default mode remains classpath-based. `scripts/dev.ps1` opts into the source directory; no secrets or source resumes are served.

Verification: frontend production build and 33 tests; Maven verify with 7 tests, including local content reload without service restart; PowerShell startup syntax parsed; the local API matched the source in all three languages. Native wide/narrow visual checks could not be completed: Computer Use stopped because it could not reliably establish the browser URL. Container build remains unverified.

Local development: run `scripts/dev.ps1`, then open http://localhost:5173 (API 8080).

## S1-02 — Docker API test button

Acceptance: replace the About dialog's pending badge with `test`; call Java, log access at INFO, then show a localized pixel-style popup; handle connection failures and prevent duplicate requests. No Bedrock/AWS calls.

Implemented `POST /api/bedrock` and the frontend dialog. Verified: 39 frontend tests and production build; Maven verify with 8 tests including HTTP response and captured INFO log; both Docker images built and containers healthy; POST through Nginx on port 3000 returned PREPARING and appeared in backend INFO logs. Native browser appearance remains unverified. No AWS resources created.

## Phase 1 ? API logging and DevOps preparation

Scope: all synchronous /api calls get INFO stdout + rotated info.log; POST /api/bedrock remains a testing placeholder. Keep local independent frontend/backend containers and dev scripts. Prepare AWS CodeBuild CI, static verification bundle and AWS architecture/cost/release documents. No AWS resources, production deployment, branch protection, commits or pushes. See docs/verification.md for actual checks and gaps.
