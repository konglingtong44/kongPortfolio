variable "enable_deployment" {
  type    = bool
  default = false
  validation {
    condition     = !var.enable_deployment || var.enable_green
    error_message = "Deployment requires Green and both human approval gates."
  }
}
locals {
  deployment_count       = var.enable_deployment ? 1 : 0
  deployment_name        = "kongportfolio-deploy"
  deployment_project_arn = "arn:aws:codebuild:ap-northeast-1:${var.expected_account_id}:project/${local.deployment_name}"
  deployment_app_arn     = "arn:aws:codedeploy:ap-northeast-1:${var.expected_account_id}:application:kongportfolio"
  deployment_group_arn   = "arn:aws:codedeploy:ap-northeast-1:${var.expected_account_id}:deploymentgroup:kongportfolio/production"
}
resource "aws_codedeploy_app" "portfolio" {
  count            = local.deployment_count
  name             = "kongportfolio"
  compute_platform = "Lambda"
}
resource "aws_iam_role" "codedeploy" {
  count              = local.deployment_count
  name               = "kongportfolio-codedeploy"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "codedeploy.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
resource "aws_iam_role_policy" "codedeploy" {
  count = local.deployment_count
  name  = "route-single-production-function"
  role  = aws_iam_role.codedeploy[0].id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["lambda:GetAlias", "lambda:UpdateAlias", "lambda:GetProvisionedConcurrencyConfig"], Resource = [local.green_function_arn, "${local.green_function_arn}:live"] },
    { Effect = "Allow", Action = ["cloudwatch:DescribeAlarms"], Resource = "*" }
  ] })
}
resource "aws_cloudwatch_metric_alarm" "deployment_errors" {
  count               = local.deployment_count
  alarm_name          = "kongportfolio-prod-live-errors"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = "kongportfolio-prod", Resource = "kongportfolio-prod:live" }
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  evaluation_periods  = 1
  period              = 60
  statistic           = "Sum"
  treat_missing_data  = "notBreaching"
}
resource "aws_codedeploy_deployment_group" "production" {
  count                  = local.deployment_count
  app_name               = aws_codedeploy_app.portfolio[0].name
  deployment_group_name  = "production"
  service_role_arn       = aws_iam_role.codedeploy[0].arn
  deployment_config_name = "CodeDeployDefault.LambdaCanary10Percent5Minutes"
  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }
  alarm_configuration {
    enabled                   = true
    ignore_poll_alarm_failure = false
    alarms                    = [aws_cloudwatch_metric_alarm.deployment_errors[0].alarm_name]
  }
  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_ALARM", "DEPLOYMENT_STOP_ON_REQUEST"]
  }
  depends_on = [aws_iam_role_policy.codedeploy]
}
resource "aws_cloudwatch_log_group" "deployment" {
  count             = local.deployment_count
  name              = "/aws/codebuild/${local.deployment_name}"
  retention_in_days = 7
}
resource "aws_iam_role" "deployment" {
  count = local.deployment_count
  name  = "${local.deployment_name}-build"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect    = "Allow", Principal = { Service = "codebuild.amazonaws.com" }, Action = "sts:AssumeRole",
    Condition = { StringEquals = { "aws:SourceAccount" = var.expected_account_id }, ArnEquals = { "aws:SourceArn" = local.deployment_project_arn } }
  }] })
}
resource "aws_iam_role_policy" "deployment" {
  count = local.deployment_count
  name  = "approved-codedeploy-and-observation"
  role  = aws_iam_role.deployment[0].id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.deployment[0].arn}:*" },
    { Effect = "Allow", Action = ["s3:GetBucketAcl", "s3:GetBucketLocation"], Resource = aws_s3_bucket.artifacts[0].arn },
    { Effect = "Allow", Action = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject"], Resource = "${aws_s3_bucket.artifacts[0].arn}/${local.candidate_artifact_prefix}/*" },
    { Effect = "Allow", Action = ["codeconnections:UseConnection"], Resource = aws_codeconnections_connection.github.arn, Condition = { StringEquals = { "codeconnections:FullRepositoryId" = "konglingtong44/kongPortfolio" } } },
    { Effect = "Allow", Action = ["codepipeline:GetPipelineExecution", "codepipeline:ListActionExecutions"], Resource = local.pipeline_arn },
    { Effect = "Allow", Action = ["lambda:GetAlias"], Resource = local.green_function_arn },
    { Effect = "Allow", Action = ["lambda:GetFunctionConfiguration", "lambda:InvokeFunction"], Resource = "${local.green_function_arn}:*" },
    { Effect = "Allow", Action = ["codedeploy:CreateDeployment", "codedeploy:GetDeploymentGroup", "codedeploy:ListDeployments", "codedeploy:GetDeployment"], Resource = local.deployment_group_arn },
    { Effect = "Allow", Action = ["codedeploy:GetApplicationRevision", "codedeploy:RegisterApplicationRevision"], Resource = local.deployment_app_arn },
    { Effect = "Allow", Action = ["codedeploy:GetDeploymentConfig"], Resource = ["arn:aws:codedeploy:ap-northeast-1:${var.expected_account_id}:deploymentconfig:CodeDeployDefault.LambdaCanary10Percent5Minutes", "arn:aws:codedeploy:ap-northeast-1:${var.expected_account_id}:deploymentconfig:CodeDeployDefault.LambdaAllAtOnce"] },
    # StopDeployment has no resource-level IAM support; check app/group/description before stopping.
    { Effect = "Allow", Action = ["codedeploy:StopDeployment"], Resource = "*" }
  ] })
}
resource "aws_codebuild_project" "deployment" {
  count                  = local.deployment_count
  name                   = local.deployment_name
  service_role           = aws_iam_role.deployment[0].arn
  build_timeout          = 15
  queued_timeout         = 5
  concurrent_build_limit = 1
  auto_retry_limit       = 0
  artifacts { type = "CODEPIPELINE" }
  source {
    type      = "CODEPIPELINE"
    buildspec = "codebuild/deployment.yml"
  }
  environment {
    type            = "LINUX_CONTAINER"
    compute_type    = "BUILD_GENERAL1_SMALL"
    image           = "aws/codebuild/amazonlinux-x86_64-standard:5.0"
    privileged_mode = false
    environment_variable {
      name  = "DEPLOY_ACCOUNT_ID"
      value = var.expected_account_id
    }
  }
  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.deployment[0].name
      status     = "ENABLED"
    }
    s3_logs { status = "DISABLED" }
  }
  depends_on = [aws_iam_role_policy.deployment]
}
