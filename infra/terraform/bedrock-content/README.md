# Approved Bedrock content

Tokyo/account-pinned private S3 storage for approved visitor-facing facts. This is ordinary S3, not a Bedrock Knowledge Base or vector index. Independent state key: `bedrock-content/terraform.tfstate`; reuse the existing state bucket. It does not publish Lambda code or change release approvals.

Live increment (2026-11-14): 9 resources created, no existing-resource updates/deletions. Bucket `kongportfolio-content-561798268037-ap-northeast-1`, fixed key `approved/facts.txt`; SSE-S3, blocked public access, bucket-owner-enforced ownership, TLS-only policy, versioning, noncurrent versions expire after 90 days. No paid customer-managed KMS key. Bucket/current object have `prevent_destroy`.

The initial object contained the existing public summary. A later import on November 14 replaced the current object with curated, redacted career facts (6,875 codepoints / 17,433 bytes), retaining the initial version for rollback. The original DOC was never uploaded or modified; neither source nor curated content is committed. STG execution role alone has `s3:GetObjectVersion` for this key and approved version IDs. No list/write/latest-read permission is granted. Production reader/model permissions remain disabled; no CloudFront or website origin serves this bucket.

The subsequent `portfolio-scope-v1` increment changes only the service-scope paragraph (career facts unchanged): 6,943 codepoints / 17,637 bytes. Prior versions remain explicitly allowed for rollback; application configuration and model enablement are still separate and disabled. See [strict question scope](../../../docs/bedrock-scope.md).

Use ignored local inputs and an existing approved backend file:

```powershell
terraform -chdir=infra/terraform/bedrock-content init '-backend-config=../../../.local/bedrock-content.backend.hcl'
terraform -chdir=infra/terraform/bedrock-content validate
terraform -chdir=infra/terraform/bedrock-content test
terraform -chdir=infra/terraform/bedrock-content plan '-var-file=../../../.local/bedrock-content.tfvars.json' '-out=../../../.local/bedrock-content-approved.tfplan'
# Review the complete plan before applying the saved plan.
```

Input `approved_text_path` is a local UTF-8 source file, not inline personal data. Keep real resume sources in ignored `.local/`; do not commit them or generated plans/state. The file must be nonempty, at most 20,000 Unicode codepoints and 80 KiB. Do not use the front-end bucket or publish the raw resume through static artifacts.

For an update: preserve version IDs still used by live/Green/rollback in `rollback_version_ids`, review/upload the new source through a saved Terraform plan, then review the output `application_environment` in the STG/PROD configuration roots and publish through AWS CI/CD. The content root does not auto-enable the model. Retire old IAM version references only after old releases no longer need them; lifecycle expiration also limits long-term rollback.

Verification and cost decision: [docs/bedrock-content.md](../../../docs/bedrock-content.md).
