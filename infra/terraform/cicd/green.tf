variable "enable_green" {
  type        = bool
  default     = false
  description = "Enable reviewed production Green verification after approval 1; never cut live traffic."
  validation {
    condition     = !var.enable_green || var.enable_staging
    error_message = "Green requires STG and approval 1."
  }
}
locals {
  green_count        = var.enable_green ? 1 : 0
  green_name         = "kongportfolio-green"
  green_project_arn  = "arn:aws:codebuild:ap-northeast-1:${var.expected_account_id}:project/${local.green_name}"
  green_function_arn = "arn:aws:lambda:ap-northeast-1:${var.expected_account_id}:function:kongportfolio-prod"
  pipeline_arn       = "arn:aws:codepipeline:ap-northeast-1:${var.expected_account_id}:${local.candidate_name}"
}
resource "aws_cloudwatch_log_group" "green" {
  count             = local.green_count
  name              = "/aws/codebuild/${local.green_name}"
  retention_in_days = 7
}
resource "aws_iam_role" "green" {
  count = local.green_count
  name  = "${local.green_name}-build"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow", Principal = { Service = "codebuild.amazonaws.com" }, Action = "sts:AssumeRole"
      Condition = { StringEquals = { "aws:SourceAccount" = var.expected_account_id }, ArnEquals = { "aws:SourceArn" = local.green_project_arn } }
    }]
  })
}
resource "aws_iam_role_policy" "green" {
  count = local.green_count
  name  = "publish-and-verify-green-without-routing"
  role  = aws_iam_role.green[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.green[0].arn}:*" },
      { Effect = "Allow", Action = ["s3:GetBucketAcl", "s3:GetBucketLocation"], Resource = aws_s3_bucket.artifacts[0].arn },
      { Effect = "Allow", Action = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject"], Resource = "${aws_s3_bucket.artifacts[0].arn}/${local.candidate_artifact_prefix}/*" },
      {
        Effect    = "Allow", Action = ["codeconnections:UseConnection"], Resource = aws_codeconnections_connection.github.arn
        Condition = { StringEquals = { "codeconnections:FullRepositoryId" = "konglingtong44/kongPortfolio" } }
      },
      { Effect = "Allow", Action = ["codepipeline:GetPipelineExecution", "codepipeline:ListActionExecutions"], Resource = local.pipeline_arn },
      { Effect = "Allow", Action = ["lambda:GetFunctionConfiguration", "lambda:ListVersionsByFunction", "lambda:UpdateFunctionCode", "lambda:PublishVersion"], Resource = local.green_function_arn },
      { Effect = "Allow", Action = ["lambda:GetFunctionConfiguration", "lambda:InvokeFunction"], Resource = "${local.green_function_arn}:*" },
      # GetAlias is authorized against the function resource, not the alias ARN.
      { Effect = "Allow", Action = ["lambda:GetAlias"], Resource = local.green_function_arn },
      { Effect = "Allow", Action = ["lambda:GetFunctionConfiguration"], Resource = "${local.staging_arn}:*" }
    ]
  })
}
resource "aws_codebuild_project" "green" {
  count                  = local.green_count
  name                   = local.green_name
  service_role           = aws_iam_role.green[0].arn
  build_timeout          = 10
  queued_timeout         = 5
  concurrent_build_limit = 1
  auto_retry_limit       = 0
  artifacts { type = "CODEPIPELINE" }
  source {
    type      = "CODEPIPELINE"
    buildspec = "codebuild/green.yml"
  }
  environment {
    type                        = "LINUX_CONTAINER"
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux-x86_64-standard:5.0"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = false
    environment_variable {
      name  = "GREEN_ACCOUNT_ID"
      value = var.expected_account_id
    }
    environment_variable {
      name  = "GREEN_FUNCTION_NAME"
      value = "kongportfolio-prod"
    }
  }
  logs_config {
    cloudwatch_logs {
      status     = "ENABLED"
      group_name = aws_cloudwatch_log_group.green[0].name
    }
    s3_logs { status = "DISABLED" }
  }
  depends_on = [aws_iam_role_policy.green]
}
