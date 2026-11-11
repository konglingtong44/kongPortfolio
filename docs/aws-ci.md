# CodeBuild CI — S3-02 completed

Execution (2026-11-12): user approved all eight resources and initial builds. All eight resources are created; final Terraform plan has no changes. Initial backend project creation returned an OAuth authorization error; retry of only that missing project succeeded with unchanged IAM policies. Source was published on `feat/aws-serverless-ci`; main and production remain unchanged. Preparation commands below are historical; do not repeat the create plan.

First builds exposed missing executable Git modes on hooks. Both hooks now use 100755 and local tests inspect the Git index to catch Linux incompatibility. Both retry builds at `00b64d9972bb9e6d34b6c1698791026849abd167` succeeded:

| Component | AWS build ID suffix | Wall time | Verified |
| --- | --- | --- | --- |
| frontend | 16ecf0db-bd4d-4abb-9acd-5d34330a9dc5 | 38.7 s | 40 tests, TypeScript/Vite, clean verification bundle |
| backend | 553f9286-9ca9-4cf2-87bc-81c37d331259 | 78.5 s | 9 HTTP + 3 Lambda tests, ZIP and packaged JVM smoke |

Including the two initial failed builds, rounded wall times total approximately five minutes / $0.025 compute before allowance. This is an estimate, not a billing statement; logs/taxes are separate. AWS source revision matches the pinned commit and both builds ran application checks. Raw logs/results are in ignored `.local/`. No automatic trigger or production release is configured.

Remaining gap: GitHub public commit-status and check-run APIs returned zero entries despite status reporting being configured. Do not make `ci/frontend` / `ci/backend` required branch checks until real writeback is verified. Investigate during the automatic CI increment; do not substitute a PAT or expand production permissions. No claim that PR checks or automatic CI are complete.

Acceptance: Terraform plan for separate React and Spring Boot checks, least-privilege roles, bounded on-demand builds and reproducible source revision. Production remains unchanged. Actual AWS build success is required after approval; a local check is not a cloud build.

## Reviewed scope

`infra/terraform/cicd/build.tf` adds 8 resources: two CodeBuild projects, two IAM roles, two inline policies and two seven-day log groups. Connection remains unchanged. Each project uses Linux x86 small on demand (2 vCPU / 3 GB), Amazon Linux standard 5.0, Node 24 / Corretto 21, 15-minute timeout, five-minute queue timeout, concurrency one and zero automatic retries. Maximum concurrent builds across both projects is two. No reserved capacity, privileged Docker, webhook, deployment or persistent build artifact/cache is configured.

CI roles can obtain a token from the existing connection and write only their own logs. They cannot read Terraform state, publish to the website bucket, change Lambda, deploy, access secrets or call Bedrock. GitHub app repository selection remains the authorization boundary; use only kongPortfolio. Source status contexts are `ci/frontend` and `ci/backend`.

Frontend: secret/path checks, routing/hook checks, 40 frontend tests, TypeScript/Vite build and verification bundle. Backend: the same shared checks, normal HTTP tests, Lambda adapter tests, Lambda ZIP assembly and ZIP-only JVM smoke. Bundles are ephemeral for this CI Story. A later release pipeline will use its own artifact storage/roles.

## Cost, verified 2026-11-12

Tokyo pricing catalog: `APN1-Build-Min:Linux:g1.small`, $0.005 per build minute. CodeBuild rounds each build to a minute. The published monthly allowance is 100 minutes total for eligible small on-demand EC2 builds, shared with other account usage. Estimate 20 paired checks × (5 frontend + 5 backend minutes) = 200 minutes: $1 before allowance, $0.50 if all 100 free minutes remain. Runtime is an estimate, not measured AWS performance. Two initial builds at the 15-minute limits cost about $0.15 before allowance; this is a compute estimate, not an account spending cap. Logs, data transfer and taxes are additional. Idle projects have no running build compute. No pipeline fees in this Story.

Sources: [AWS pricing](https://aws.amazon.com/codebuild/pricing/), [Tokyo price catalog](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/CodeBuild/current/ap-northeast-1/index.json), [supported Node/Java runtimes](https://docs.aws.amazon.com/codebuild/latest/userguide/available-runtimes.html).

## Execution and handoff

Original preparation commands:

```powershell
$env:AWS_PROFILE = 'kong-dev'
terraform -chdir=infra/terraform/cicd validate
terraform -chdir=infra/terraform/cicd test
terraform -chdir=infra/terraform/cicd plan -input=false '-var=enable_ci=true' '-out=ci.tfplan'
```

Approved plan: **8 add / 0 change / 0 destroy**, now applied. `enable_ci = true` is persisted in ignored `terraform.tfvars`; omitting it on another machine would propose removing CI. Recheck plan freshness and scope before future apply. Never commit tfvars, plan or state files.

GitHub main is still the earlier baseline; reviewed source is on the feature branch. For future manual builds, start each project pinned to the exact full commit SHA, not a moving branch. Verify `resolvedSourceVersion`, both final statuses and logs. Clone permission and managed-image runtime are now verified. No webhook is enabled: automatic triggering is the next increment. Builds cannot deploy the website.

Local verification: Terraform fmt/validate; two mocked plans covering default-off capacity, time/concurrency limits, retention and action allowlist; Bash syntax; frontend tests/build; backend HTTP/Lambda tests and ZIP smoke; routing/hooks and Gitleaks. See PROJECT_PLAN.md for completion status. Next Story: automatic CI triggering/status writeback, then release pipeline, two production approval gates and CodeDeploy blue/green.
