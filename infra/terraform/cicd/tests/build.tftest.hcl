mock_provider "aws" {}

variables {
  expected_account_id       = "123456789012"
  enable_ci                 = false
  enable_ci_webhooks        = false
  enable_candidate_pipeline = false
  enable_staging            = false
}

run "default_creates_no_build_capacity" {
  command = plan
  assert {
    condition     = length(aws_codebuild_project.ci) == 0 && length(aws_iam_role.ci) == 0 && length(aws_cloudwatch_log_group.ci) == 0
    error_message = "CI must require explicit opt-in."
  }
}

run "ci_is_bounded_and_has_no_deployment_permissions" {
  command = plan
  variables { enable_ci = true }
  override_resource {
    override_during = plan
    target          = aws_codeconnections_connection.github
    values          = { arn = "arn:aws:codeconnections:ap-northeast-1:123456789012:connection/example" }
  }
  override_resource {
    override_during = plan
    target          = aws_cloudwatch_log_group.ci["frontend"]
    values          = { arn = "arn:aws:logs:ap-northeast-1:123456789012:log-group:/aws/codebuild/kongportfolio-ci-frontend" }
  }
  override_resource {
    override_during = plan
    target          = aws_cloudwatch_log_group.ci["backend"]
    values          = { arn = "arn:aws:logs:ap-northeast-1:123456789012:log-group:/aws/codebuild/kongportfolio-ci-backend" }
  }
  assert {
    condition = length(aws_codebuild_project.ci) == 2 && alltrue([
      for p in aws_codebuild_project.ci : p.build_timeout == 15 && p.concurrent_build_limit == 1 && p.auto_retry_limit == 0 && !p.environment[0].privileged_mode && p.environment[0].compute_type == "BUILD_GENERAL1_SMALL" && p.artifacts[0].type == "NO_ARTIFACTS"
    ])
    error_message = "Builds must have bounded on-demand capacity and no privileged Docker or artifact publishing."
  }
  assert {
    condition = alltrue([for policy in aws_iam_role_policy.ci : toset(flatten([
      for statement in jsondecode(policy.policy).Statement : statement.Action
    ])) == toset(["codeconnections:GetConnectionToken", "codeconnections:GetConnection", "logs:CreateLogStream", "logs:PutLogEvents"])])
    error_message = "CI roles must not gain deployment, secret, S3 state or Bedrock permissions."
  }
  assert {
    condition     = alltrue([for group in aws_cloudwatch_log_group.ci : group.retention_in_days == 7])
    error_message = "Build logs must expire after seven days."
  }
}
