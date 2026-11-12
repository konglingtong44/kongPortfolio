mock_provider "aws" {}
variables {
  enable_frontend_release   = false
  enable_deployment         = false
  expected_account_id       = "123456789012"
  enable_ci                 = false
  enable_ci_webhooks        = false
  enable_candidate_pipeline = true
  enable_staging            = false
  enable_green              = false
}
run "green_default_off" {
  command = plan
  assert {
    condition     = length(aws_codebuild_project.green) == 0 && length(aws_iam_role.green) == 0
    error_message = "Production Green capability requires explicit opt-in."
  }
}
run "green_is_between_two_human_gates" {
  command = plan
  variables {
    enable_staging           = true
    enable_green             = true
    staging_bootstrap_zip    = "tests/fixtures/staging-bootstrap.txt"
    staging_bootstrap_sha256 = filesha256("tests/fixtures/staging-bootstrap.txt")
  }
  override_resource {
    override_during = plan
    target          = aws_s3_bucket.artifacts[0]
    values          = { arn = "arn:aws:s3:::candidate-test", id = "candidate-test" }
  }
  override_resource {
    override_during = plan
    target          = aws_cloudwatch_log_group.green[0]
    values          = { arn = "arn:aws:logs:ap-northeast-1:123456789012:log-group:/aws/codebuild/kongportfolio-green" }
  }
  override_resource {
    override_during = plan
    target          = aws_codeconnections_connection.github
    values          = { arn = "arn:aws:codeconnections:ap-northeast-1:123456789012:connection/example" }
  }
  assert {
    condition     = length(aws_codepipeline.candidate[0].stage) == 6 && aws_codepipeline.candidate[0].stage[3].action[0].provider == "Manual" && aws_codepipeline.candidate[0].stage[4].name == "VerifyGreen" && aws_codepipeline.candidate[0].stage[5].action[0].provider == "Manual"
    error_message = "Green must follow approval 1 and stop before approval 2; no traffic action yet."
  }
  assert {
    condition     = !strcontains(aws_iam_role_policy.green[0].policy, "UpdateAlias") && !strcontains(aws_iam_role_policy.green[0].policy, "CreateAlias") && !strcontains(aws_iam_role_policy.green[0].policy, "PutApprovalResult") && !strcontains(aws_iam_role_policy.green[0].policy, "UpdateFunctionConfiguration")
    error_message = "Green verifier cannot route live traffic, change config or approve itself."
  }
  assert {
    condition     = alltrue([for statement in jsondecode(aws_iam_role_policy.green[0].policy).Statement : statement.Resource == "arn:aws:lambda:ap-northeast-1:123456789012:function:kongportfolio-prod" if contains(statement.Action, "lambda:UpdateFunctionCode")]) && aws_codebuild_project.green[0].build_timeout == 10 && aws_codebuild_project.green[0].concurrent_build_limit == 1 && aws_cloudwatch_log_group.green[0].retention_in_days == 7
    error_message = "Limit writes to intended production code and bounded verification capacity."
  }
}
run "green_requires_staging" {
  command = plan
  variables { enable_green = true }
  expect_failures = [var.enable_green]
}
