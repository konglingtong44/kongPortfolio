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
run "staging_default_off" {
  command = plan
  assert {
    condition     = length(aws_lambda_function.staging) == 0 && length(aws_codepipeline.candidate[0].stage) == 2
    error_message = "Existing candidate-only pipeline must remain unchanged before opt-in."
  }
}
run "staging_isolated_then_manual_gate" {
  command = plan
  variables {
    enable_staging           = true
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
    target          = aws_cloudwatch_log_group.staging_build[0]
    values          = { arn = "arn:aws:logs:ap-northeast-1:123456789012:log-group:/aws/codebuild/kongportfolio-stg" }
  }
  override_resource {
    override_during = plan
    target          = aws_cloudwatch_log_group.staging_lambda[0]
    values          = { arn = "arn:aws:logs:ap-northeast-1:123456789012:log-group:/aws/lambda/kongportfolio-stg" }
  }
  override_resource {
    override_during = plan
    target          = aws_codeconnections_connection.github
    values          = { arn = "arn:aws:codeconnections:ap-northeast-1:123456789012:connection/example" }
  }
  assert {
    condition     = aws_lambda_function.staging[0].function_name == "kongportfolio-stg" && aws_lambda_function.staging[0].reserved_concurrent_executions == 1 && aws_lambda_function.staging[0].memory_size == 1024 && aws_lambda_function.staging[0].timeout == 28
    error_message = "Create bounded isolated STG, never modify the production function."
  }
  assert {
    condition     = length(aws_codepipeline.candidate[0].stage) == 4 && aws_codepipeline.candidate[0].stage[2].name == "VerifyStaging" && aws_codepipeline.candidate[0].stage[2].action[0].configuration["PrimarySource"] == "SourceRef" && aws_codepipeline.candidate[0].stage[3].action[0].provider == "Manual"
    error_message = "Verify the existing candidate before the first human production gate."
  }
  assert {
    condition = alltrue([for statement in jsondecode(aws_iam_role_policy.staging_build[0].policy).Statement :
      contains(["arn:aws:lambda:ap-northeast-1:123456789012:function:kongportfolio-stg", "arn:aws:lambda:ap-northeast-1:123456789012:function:kongportfolio-stg:*"], statement.Resource) if anytrue([for action in statement.Action : startswith(action, "lambda:")])
    ]) && !strcontains(aws_iam_role_policy.staging_build[0].policy, "PutApprovalResult") && !strcontains(aws_iam_role_policy.staging_build[0].policy, "UpdateFunctionConfiguration")
    error_message = "STG verifier must not change production/configuration or approve itself."
  }
  assert {
    condition     = aws_cloudwatch_log_group.staging_build[0].retention_in_days == 7 && aws_cloudwatch_log_group.staging_lambda[0].retention_in_days == 7 && aws_codebuild_project.staging[0].build_timeout == 10
    error_message = "Keep bounded verification and seven-day logs."
  }
}
run "staging_requires_pipeline" {
  command = plan
  variables {
    enable_candidate_pipeline = false
    enable_staging            = true
  }
  expect_failures = [var.enable_staging]
}
