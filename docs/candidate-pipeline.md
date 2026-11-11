# S3-04 — CodePipeline candidate build verified

Completed 2026-11-12: user approved the plan; all 14 resources created. Fixed actual truncated artifact prefix in two scoped policies/lifecycle and set CI=true globally in buildspec. Seven Terraform tests pass; final plan No changes. Successful pipeline execution `e7b0712d-6cbb-4046-92a7-ce4a26fb98f9` built commit `4d00463b90231efc89c872c32c230e516d158780`: frontend 40 tests/build, backend 9+3 tests/ZIP smoke, real package and upload all pass. Downloaded exact S3 VersionId `LRR8Sr9BeVXnbqAMNnvMlqtvESuxeC1Z` at `kongportfolio-candid/Candidate/OlNePu1`, matching outer and inner checksums and manifest. ReleaseId `f6c6341fa32de2315789c757d9b563f5a04d9ec6cd7a3c7b93361a0728337a2e`. Actual artifact uses an AWS-managed KMS key; bucket default is AES256. No production deploy or gates added yet. Full commands, failures and cost scope are in root execution log section 5.

Current machine persists enable_candidate_pipeline=true in ignored local inputs. New checkouts default to false: restore intended inputs before planning to avoid proposed removals (the artifact bucket has prevent_destroy). Pipeline reuses the current CodeConnection with its own private versioned artifact bucket, build project, roles and seven-day logs. Source → BuildCandidate only; no production resources, STG or approval/deployment stages yet. Future order remains STG validation → production approval 1 → create/test Green → production approval 2 → CodeDeploy traffic shift/rollback.

Historical local preparation passed at clean commit `37237d4aaa123b5aaf6a31642dc88a5dd9ee521d`: complete ci.sh all (frontend 40 tests/build, backend 9 HTTP + 3 Lambda tests and ZIP smoke), real version-prefixed candidate packaging and checksum verification, seven Terraform plan tests and integrity negative cases. Local candidate ID `9aa8d398127a78fe06decc4f36b13434cae0d0f758cf0069781cbf9e38af029a` remains under ignored `.local/pipeline-candidate`; it is distinct from the subsequently verified AWS artifact above and must not be substituted for it.

Published source/documentation at `6a225b59b930d1cefdc63a11710d00f570d8e3dc`; both existing webhook CI builds and GitHub statuses passed. This does not replace the candidate pipeline's future AWS verification. Final verification notes are committed locally for the next publish.

V2 pipeline uses QUEUED execution and DetectChanges=false to avoid duplicating PR CI on every push. Source branch is feat/aws-serverless-ci until the reviewed change is merged to main. Full-clone reference allows ci.sh to inspect real Git history and clean checkout. Package jobs use CODEPIPELINE artifacts; output is a source-identified candidate, not an approved production release. Source and build roles can access only the designated connection, artifact prefix/project/logs; existing CI roles and website remain unchanged.

Candidate contains backend.zip, version-prefixed frontend files, manifest.json and SHA256SUMS. Manifest v2 records clean Git commit and every file checksum. releaseId hashes the commit and backend ZIP checksum, so a rebuilt ZIP has a distinct identity. Checksums detect accidental corruption; they are not signatures or production authorization. S3 versioning retains object identity; candidate prefix expires after 30 days (noncurrent versions after seven). A later promotion must copy/retain the approved exact artifact before expiration. Never rebuild after production approval and assume it is the same artifact.

## Reviewed plan and cost

14 creates / 0 updates / 0 deletes: seven S3 resources (bucket, public block, ownership, encryption, versioning, lifecycle, TLS policy), one log group, two roles, two inline policies, one CodeBuild project and one CodePipeline. No customer-managed KMS key, VPC, NAT, Lambda/website update or pipeline webhook. S3 has prevent_destroy; disabling the feature later requires an explicit retention/removal decision.

Rates checked 2026-11-12: V2 $0.002/action-minute, including source and build; 100 shared free action-minutes/month. CodeBuild small is separately $0.005/minute with its shared allowance. Example one source minute + five build minutes: $0.012 pipeline + $0.025 build = $0.037/run before allowances, plus S3/logs/any managed encryption request charges/tax. Twenty such runs: about $0.74 before allowances, separate from existing PR CI. Runtime is an estimate. Build timeout 15 minutes, queue five, concurrency one, zero retries. Creation may result in an initial execution; approval should include that and one deliberate verification execution if needed. These are estimates, not spending caps.

Sources: [CodePipeline pricing](https://aws.amazon.com/codepipeline/pricing/), [CodeBuild pricing](https://aws.amazon.com/codebuild/pricing/), [full-clone source](https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodestarConnectionSource.html), [clone role permissions](https://docs.aws.amazon.com/codepipeline/latest/userguide/troubleshooting.html).

## Commands and validation

```powershell
$env:AWS_PROFILE = 'kong-dev'
terraform -chdir=infra/terraform/cicd fmt -check -recursive
terraform -chdir=infra/terraform/cicd validate
terraform -chdir=infra/terraform/cicd test
terraform -chdir=infra/terraform/cicd plan -input=false '-var=enable_candidate_pipeline=true' '-out=candidate.tfplan'
node scripts/test-pipeline-candidate.mjs
```

The above commands describe original preparation; do not reapply stale create plans. Full commands/outcomes are recorded in [AWS_EXECUTION_LOG.md](../AWS_EXECUTION_LOG.md). Offline integrity fixtures test tampering/path safety, not ZIP runtime; packaged JVM smoke is a separate check. Full clone, managed artifact upload/encryption, role assumptions and version-pinned download are now verified in AWS.

For another deliberate candidate: publish reviewed source, start this pipeline with an explicit Source commit override, then verify Source/Build SHA, checks, S3 key/version and downloaded checksums. Keep existing first-release apply/publisher scripts separate; do not use them to deploy manifest v2. This pipeline prepares candidates only. Lifecycle expires unpromoted candidates after 30 days.
