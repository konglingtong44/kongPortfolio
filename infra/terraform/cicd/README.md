# AWS source connection — S3-01

S3-02 CodeBuild preparation is now available in `build.tf`, disabled by default. See [scope, costs and execution](../../../docs/aws-ci.md). Source connection Story below describes the already completed baseline.

Acceptance: one Terraform-managed GitHub CodeConnection in Tokyo, isolated locked remote state, account restriction and repeatable read-only readiness check. The repository owner completes OAuth in the console. No CodeBuild, pipeline, webhook or deployment is created by this Story.

2026-11-12: applied 1 add / 0 change / 0 destroy; subsequent plan No changes. Connection `kongportfolio-github` is PENDING, awaiting owner OAuth. ARN suffix `ff3ddf98-05c3-41fa-8bfe-f738a90df1d6`. Current local deployment/CI changes are not on GitHub yet; first CI execution must use reviewed, published source. Terraform fmt/validate, PowerShell parser, actual pending rejection, wrong-account guard, 28 hook checks and Gitleaks passed. Application tests were not rerun for this infrastructure-only Story.

Owner subsequently completed OAuth. AWS CLI readiness check now passes with `AVAILABLE`; Terraform refresh-only apply records that external status change without changing AWS resources. Repository clone/build and webhook access remain unverified until the first real CodeBuild run.

Existing state bucket is reused with key `cicd/terraform.tfstate`; application and bootstrap states are separate. Copy the two `.example` input files to ignored `backend.hcl` / `terraform.tfvars`, replacing `<ACCOUNT_ID>`. Keep the provider lock file in Git. Use SSO locally, IAM roles in future AWS builds.

```powershell
$env:AWS_PROFILE = 'kong-dev'
Set-Location infra/terraform/cicd
terraform init '-backend-config=backend.hcl' -lockfile=readonly
terraform fmt -check
terraform validate
terraform plan -input=false '-out=connection.tfplan'
# Review: exactly one aws_codeconnections_connection create; no other changes.
terraform apply -input=false connection.tfplan
```

Complete the pending `kongportfolio-github` connection in the Tokyo [AWS Connections console](https://ap-northeast-1.console.aws.amazon.com/codesuite/settings/connections?region=ap-northeast-1). Install/choose the GitHub app for `konglingtong44`; select **Only select repositories → kongPortfolio**, then complete the connection. Do not create a second connection or share a personal access token. An `AVAILABLE` connection is not itself proof that builds can clone the repository: the first real CodeBuild run must verify that.

From the repository root, check the ARN returned by Terraform:

```powershell
./scripts/check-source-connection.ps1 -ExpectedAccountId '<ACCOUNT_ID>' -ConnectionArn '<CONNECTION_ARN>' -Profile kong-dev
```

This read-only command exits with an error while `PENDING`/`ERROR`, in the wrong account/region, or for another provider/connection. After OAuth, run Terraform plan again; its status output may need a refresh-only apply to save `AVAILABLE` to state. No connection replacement is needed. `prevent_destroy` guards against accidental loss of the authorization.

Next Story: separately approve and create bounded CodeBuild CI projects, publish reviewed source, and run real frontend/backend checks. Then CodePipeline release stages and Lambda CodeDeploy blue/green with two production approval gates. Bedrock remains a placeholder until its own Story. CodeConnection has no build/runtime capacity; future builds, pipelines, logs and artifacts have their own charges. Existing S3 state requests/storage still apply.

References: [AWS OAuth requirement](https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-update.html), [Terraform resource](https://registry.terraform.io/providers/hashicorp/aws/6.72.0/docs/resources/codeconnections_connection).
