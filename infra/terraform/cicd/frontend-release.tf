variable "enable_frontend_release" {
  type    = bool
  default = false
  validation {
    condition     = !var.enable_frontend_release || var.enable_deployment
    error_message = "Frontend publication requires backend deployment and both human gates."
  }
}
locals {
  frontend_release_count       = var.enable_frontend_release ? 1 : 0
  frontend_release_name        = "kongportfolio-frontend-release"
  frontend_release_project_arn = "arn:aws:codebuild:ap-northeast-1:${var.expected_account_id}:project/${local.frontend_release_name}"
  frontend_site_arn            = "arn:aws:s3:::kongportfolio-site-${var.expected_account_id}-ap-northeast-1"
  frontend_router_arn          = "arn:aws:cloudfront::${var.expected_account_id}:function/kongportfolio-prod-spa"
}
resource "aws_cloudwatch_log_group" "frontend_release" {
  count             = local.frontend_release_count
  name              = "/aws/codebuild/${local.frontend_release_name}"
  retention_in_days = 7
}
resource "aws_iam_role" "frontend_release" {
  count = local.frontend_release_count
  name  = "${local.frontend_release_name}-build"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect    = "Allow", Principal = { Service = "codebuild.amazonaws.com" }, Action = "sts:AssumeRole",
    Condition = { StringEquals = { "aws:SourceAccount" = var.expected_account_id }, ArnEquals = { "aws:SourceArn" = local.frontend_release_project_arn } }
  }] })
}
resource "aws_iam_role_policy" "frontend_release" {
  count = local.frontend_release_count
  name  = "immutable-site-upload-and-reviewed-pointer"
  role  = aws_iam_role.frontend_release[0].id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.frontend_release[0].arn}:*" },
    { Effect = "Allow", Action = ["s3:GetBucketAcl", "s3:GetBucketLocation"], Resource = aws_s3_bucket.artifacts[0].arn },
    { Effect = "Allow", Action = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject"], Resource = "${aws_s3_bucket.artifacts[0].arn}/${local.candidate_artifact_prefix}/*" },
    { Effect = "Allow", Action = ["s3:GetObject"], Resource = "${local.frontend_site_arn}/releases/*" },
    { Effect = "Allow", Action = ["s3:PutObject"], Resource = "${local.frontend_site_arn}/releases/*", Condition = { Null = { "s3:if-none-match" = "false" } } },
    { Effect = "Allow", Action = ["codeconnections:UseConnection"], Resource = aws_codeconnections_connection.github.arn, Condition = { StringEquals = { "codeconnections:FullRepositoryId" = "konglingtong44/kongPortfolio" } } },
    { Effect = "Allow", Action = ["codepipeline:GetPipelineExecution", "codepipeline:ListActionExecutions"], Resource = local.pipeline_arn },
    { Effect = "Allow", Action = ["lambda:GetAlias"], Resource = local.green_function_arn },
    { Effect = "Allow", Action = ["lambda:GetFunctionConfiguration"], Resource = "${local.green_function_arn}:*" },
    { Effect = "Allow", Action = ["cloudfront:GetFunction", "cloudfront:DescribeFunction", "cloudfront:UpdateFunction", "cloudfront:TestFunction", "cloudfront:PublishFunction"], Resource = local.frontend_router_arn }
  ] })
}
resource "aws_codebuild_project" "frontend_release" {
  count                  = local.frontend_release_count
  name                   = local.frontend_release_name
  service_role           = aws_iam_role.frontend_release[0].arn
  build_timeout          = 15
  queued_timeout         = 5
  concurrent_build_limit = 1
  auto_retry_limit       = 0
  artifacts { type = "CODEPIPELINE" }
  source {
    type      = "CODEPIPELINE"
    buildspec = "codebuild/frontend-release.yml"
  }
  environment {
    type            = "LINUX_CONTAINER"
    compute_type    = "BUILD_GENERAL1_SMALL"
    image           = "aws/codebuild/amazonlinux-x86_64-standard:5.0"
    privileged_mode = false
    environment_variable {
      name  = "FRONTEND_ACCOUNT_ID"
      value = var.expected_account_id
    }
  }
  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.frontend_release[0].name
      status     = "ENABLED"
    }
    s3_logs { status = "DISABLED" }
  }
  depends_on = [aws_iam_role_policy.frontend_release]
}
