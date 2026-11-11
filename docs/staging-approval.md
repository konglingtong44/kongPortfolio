# S3-05 — STG verification and production approval 1

Prepared, not applied. Acceptance after approval: Source → BuildCandidate → VerifyStaging → ApproveProduction, with one immutable candidate flowing through the run. Pipeline must stop for a human after STG checks; no production Green or traffic change in this Story. Approval 2 remains mandatory after later Green validation and before CodeDeploy routing.

## Minimal STG scope

Isolated Java 21 Lambda `kongportfolio-stg`, 1 GB / 28 seconds, reserved concurrency one (not provisioned), no public endpoint, logs seven days, log-only execution role. A new CodeBuild verifier receives SourceRef as PrimarySource and Candidate as a secondary artifact. It verifies the full manifest/source SHA, uploads the exact backend ZIP with optimistic RevisionId, then invokes an immutable published version. If the same checksum/configuration is already published, reuse that version instead of rebuilding it. Checks: health, ja/zh/en profile, placeholder POST, genuine 404 and 405, successful-response no-store. Frontend file/version checks are included, but there is no separate STG website, API Gateway or browser E2E claim.

STG build role may update/publish/invoke only the STG function. It cannot alter function configuration, production functions, routing, IAM or approval decisions. Existing CI/candidate-build roles retain their boundaries. Pipeline role gains only permission to start/read the new verifier project. Source credentials still use the existing repository-scoped connection.

Terraform owns STG function configuration; pipeline owns function code after bootstrap. `ignore_changes` covers filename/source_code_hash deliberately, not runtime/role/environment. A verified local bootstrap ZIP and manifest checksum are required for creation and subsequent plans. Preserve those ignored inputs/files; another workstation must restore verified inputs before planning. Current bootstrap is the already downloaded and checksum-verified candidate `f6c634...`, not a synthetic test fixture.

## Artifact and approval

VerifyStaging publishes StagingReport with source commit, releaseId, backend checksum, Lambda code checksum, immutable version and individual check results. Raw invocation payloads/responses stay in ephemeral ignored workspace; report has no profile body. Gate CustomData shows exported releaseId/STG version plus Source commit. Review the report in the same execution before approval. Build roles have no PutApprovalResult permission. Do not put live approval tokens in logs.

This Story's gate is the first production approval boundary; nothing production-changing follows it yet. Validation should leave it pending for the owner, not automatically approve it. Default approval expiry is seven days. QUEUED execution means a pending approval holds later runs in queue; explicitly review/reject/stop stale runs before another practice run. Candidate artifacts expire after 30 days; approval/promotion must retain the exact reviewed artifact in the later release Story.

## Plan, cost and checks

Actual reviewed plan: **8 creates / 2 updates / 0 deletes**. New: Lambda, verifier project, two log groups, two roles, two inline policies. Updates: existing pipeline stages and its verifier StartBuild permission. STG is off by default; current default plan No changes. No new website/CDN/API Gateway/ALB/NAT, no production modification.

Extra STG example: 20 runs × (2 CodeBuild minutes × $0.005 + 2 pipeline action minutes × $0.002) = about $0.28 before allowances, plus small Lambda requests/duration, logs/S3/tax; previous candidate stages are separate. Actual verification time is unmeasured. No Lambda idle compute fee or provisioned concurrency is configured; reserved concurrency itself has no extra fee. Manual approval action is not billed per minute. Existing account allowances are shared, so no promise of zero cost. Verifier timeout ten minutes, queue five, concurrency one, zero auto retries.

Local checks: ten mocked Terraform plans; Node tests for production-target rejection, immutable matching, checksum/runtime/HTTP/cache failure handling; syntax checks; existing application checks run by CI. The mock bootstrap text fixture is never a deployable ZIP. Real STG update/invoke/multi-artifact exports and the pending gate require the approved cloud run. Do not treat local mocked success as STG runtime success.

Published `17f55f9e7ee60d92bf57d25e829b027ede919198`: both existing AWS CI builds and GitHub statuses pass, with frontend 40 tests/build and backend 9+3 tests/ZIP smoke. Final verification notes are committed locally for the next publish. Bootstrap hash is checked during planning; rehash the file against its verified manifest immediately before applying a saved plan as well.

Preparation commands and all file/Git/request operations: [root operation log](../AWS_EXECUTION_LOG.md), section 6. Plan inputs stay in `.local/staging-plan.tfvars.json`, plan in `infra/terraform/cicd/staging.tfplan`. After approval, persist reviewed STG inputs locally, publish source, regenerate/recheck exact plan, apply, then run a pinned pipeline revision and leave gate 1 for human review.

References: [multiple CodeBuild inputs](https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodeBuild.html), [manual approvals](https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals.html), [Lambda optimistic code updates](https://docs.aws.amazon.com/lambda/latest/api/API_UpdateFunctionCode.html), [reserved concurrency](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html), [pipeline pricing](https://aws.amazon.com/codepipeline/pricing/).
