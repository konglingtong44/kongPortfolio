# Cost control

Tokyo, account-pinned Terraform root. Reuse the existing state bucket with the independent key `cost-control/terraform.tfstate`.

Live configuration (2026-11-14): monthly USD 5/10/15/25 budgets, four SNS → Lambda subscriptions armed. The controller and console events share this root. The source default `arm_notifications=false` is for new deployments; the reviewed live input in ignored `.local/cost-control.tfvars.json` sets it to true. Do not omit live inputs or apply a default disarming plan during maintenance.

Use `terraform plan -var-file=../../../.local/cost-control.tfvars.json` and review every change before apply. Inputs and saved plans contain private notification details: keep them ignored. Never use this root to change production release approval gates.

The deployed controller's stop policy denies both `bedrock:*` (Runtime) and `bedrock-mantle:*` on the reviewed business execution roles. It does not restrict administrator SSO or other roles. Dual-endpoint denial was verified with IAM simulation; the November 14 extension did not execute another live stop/start.

Operations, billing scope, limitations and verification: [docs/aws-cost-control.md](../../../docs/aws-cost-control.md).
