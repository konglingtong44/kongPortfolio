mock_provider "aws" {}
variables {
  enable_frontend_release   = false
  expected_account_id       = "123456789012"
  enable_ci                 = false
  enable_ci_webhooks        = false
  enable_candidate_pipeline = true
  enable_staging            = true
  enable_green              = true
  enable_deployment         = false
  staging_bootstrap_zip     = "tests/fixtures/staging-bootstrap.txt"
  staging_bootstrap_sha256  = filesha256("tests/fixtures/staging-bootstrap.txt")
}
run "deployment_default_off" {
  command = plan
  assert {
    condition     = length(aws_codedeploy_app.portfolio) == 0 && length(aws_codepipeline.candidate[0].stage) == 6
    error_message = "Traffic deployment requires separate opt-in."
  }
}
run "deployment_requires_green" {
  command = plan
  variables {
    enable_deployment = true
    enable_green      = false
  }
  expect_failures = [var.enable_deployment]
}
run "two_gates_precede_bounded_canary" {
  command = plan
  variables { enable_deployment = true }
  override_resource {
    override_during = plan
    target          = aws_cloudwatch_log_group.deployment[0]
    values          = { arn = "arn:aws:logs:ap-northeast-1:123456789012:log-group:/aws/codebuild/kongportfolio-deploy" }
  }
  override_resource {
    override_during = plan
    target          = aws_s3_bucket.artifacts[0]
    values          = { arn = "arn:aws:s3:::candidate-test", id = "candidate-test" }
  }
  override_resource {
    override_during = plan
    target          = aws_codeconnections_connection.github
    values          = { arn = "arn:aws:codeconnections:ap-northeast-1:123456789012:connection/example" }
  }
  assert {
    condition     = length(aws_codepipeline.candidate[0].stage) == 7 && aws_codepipeline.candidate[0].stage[5].action[0].provider == "Manual" && aws_codepipeline.candidate[0].stage[6].name == "DeployProduction"
    error_message = "Real deployment must follow both human gates."
  }
  assert {
    condition     = one(aws_codepipeline.candidate[0].variable).name == "ReleaseMode" && one(aws_codepipeline.candidate[0].variable).default_value == "deploy" && strcontains(aws_codepipeline.candidate[0].stage[5].action[0].configuration.CustomData, "#{variables.ReleaseMode}") && strcontains(aws_codepipeline.candidate[0].stage[6].action[0].configuration.EnvironmentVariables, "DEPLOY_RELEASE_MODE")
    error_message = "Drill mode must be explicit, visible in approval 2 and passed to controller; normal deploy remains default."
  }
  assert {
    condition     = aws_codedeploy_deployment_group.production[0].deployment_config_name == "CodeDeployDefault.LambdaCanary10Percent5Minutes" && aws_codedeploy_deployment_group.production[0].auto_rollback_configuration[0].enabled && !aws_codedeploy_deployment_group.production[0].alarm_configuration[0].ignore_poll_alarm_failure
    error_message = "Canary requires automatic rollback and fail-closed alarm polling."
  }
  assert {
    condition     = aws_codebuild_project.deployment[0].concurrent_build_limit == 1 && aws_codebuild_project.deployment[0].build_timeout == 15 && aws_cloudwatch_metric_alarm.deployment_errors[0].dimensions.Resource == "kongportfolio-prod:live"
    error_message = "Bound deployment capacity and scope error alarm to live."
  }
  assert {
    condition     = !strcontains(aws_iam_role_policy.deployment[0].policy, "lambda:UpdateAlias") && !strcontains(aws_iam_role_policy.deployment[0].policy, "lambda:UpdateFunctionCode") && !strcontains(aws_iam_role_policy.deployment[0].policy, "PutApprovalResult") && alltrue([for s in jsondecode(aws_iam_role_policy.deployment[0].policy).Statement : s.Resource == "arn:aws:codedeploy:ap-northeast-1:123456789012:deploymentgroup:kongportfolio/production" if contains(s.Action, "codedeploy:GetDeployment")])
    error_message = "Build controller cannot route/publish/approve directly; observe only intended deployment group."
  }
}
