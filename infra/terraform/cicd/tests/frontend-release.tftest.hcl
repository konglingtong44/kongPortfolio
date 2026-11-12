mock_provider "aws" {}
variables {
  expected_account_id       = "123456789012"
  enable_ci                 = false
  enable_ci_webhooks        = false
  enable_candidate_pipeline = true
  enable_staging            = true
  enable_green              = true
  enable_deployment         = true
  enable_frontend_release   = false
  staging_bootstrap_zip     = "tests/fixtures/staging-bootstrap.txt"
  staging_bootstrap_sha256  = filesha256("tests/fixtures/staging-bootstrap.txt")
}
run "frontend_default_off" {
  command = plan
  assert {
    condition     = length(aws_codebuild_project.frontend_release) == 0 && length(aws_codepipeline.candidate[0].stage) == 7
    error_message = "Frontend publication needs explicit opt-in."
  }
}
run "frontend_requires_backend_deployment" {
  command = plan
  variables {
    enable_frontend_release = true
    enable_deployment       = false
  }
  expect_failures = [var.enable_frontend_release]
}
run "frontend_after_approved_backend_with_immutable_scope" {
  command = plan
  variables { enable_frontend_release = true }
  override_resource {
    override_during = plan
    target          = aws_s3_bucket.artifacts[0]
    values          = { arn = "arn:aws:s3:::candidate-test", id = "candidate-test" }
  }
  override_resource {
    override_during = plan
    target          = aws_cloudwatch_log_group.frontend_release[0]
    values          = { arn = "arn:aws:logs:ap-northeast-1:123456789012:log-group:/aws/codebuild/kongportfolio-frontend-release" }
  }
  override_resource {
    override_during = plan
    target          = aws_codeconnections_connection.github
    values          = { arn = "arn:aws:codeconnections:ap-northeast-1:123456789012:connection/example" }
  }
  assert {
    condition     = length(aws_codepipeline.candidate[0].stage) == 8 && aws_codepipeline.candidate[0].stage[7].name == "PublishFrontend" && aws_codepipeline.candidate[0].stage[5].action[0].provider == "Manual" && aws_codepipeline.candidate[0].stage[6].name == "DeployProduction" && length(aws_codepipeline.candidate[0].stage[7].action[0].input_artifacts) == 5
    error_message = "Frontend must consume same candidate/reports after both human gates and backend deployment."
  }
  assert {
    condition     = !strcontains(aws_iam_role_policy.frontend_release[0].policy, "DeleteObject") && !strcontains(aws_iam_role_policy.frontend_release[0].policy, "UpdateDistribution") && !strcontains(aws_iam_role_policy.frontend_release[0].policy, "UpdateAlias") && !strcontains(aws_iam_role_policy.frontend_release[0].policy, "PutApprovalResult") && alltrue([for s in jsondecode(aws_iam_role_policy.frontend_release[0].policy).Statement : s.Condition.Null["s3:if-none-match"] == "false" if s.Resource == "arn:aws:s3:::kongportfolio-site-123456789012-ap-northeast-1/releases/*" && contains(s.Action, "s3:PutObject")])
    error_message = "Only conditional immutable site writes; no deletes/distribution/backend routing/approval mutation."
  }
}
