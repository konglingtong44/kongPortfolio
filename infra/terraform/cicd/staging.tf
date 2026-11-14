variable "enable_staging" {
  type        = bool
  default     = false
  description = "Opt in to the reviewed STG resources and first production approval gate."
  validation {
    condition     = !var.enable_staging || var.enable_candidate_pipeline
    error_message = "STG requires the candidate pipeline."
  }
}
variable "staging_bootstrap_zip" {
  type        = string
  default     = null
  description = "Local verified Lambda ZIP for initial creation; CI owns STG code afterward."
}
variable "staging_bootstrap_sha256" {
  type        = string
  default     = null
  description = "SHA256 from the verified candidate manifest, not an invented checksum."
}
locals {
  staging_count       = var.enable_staging ? 1 : 0
  staging_name        = "kongportfolio-stg"
  staging_arn         = "arn:aws:lambda:ap-northeast-1:${var.expected_account_id}:function:${local.staging_name}"
  staging_project_arn = "arn:aws:codebuild:ap-northeast-1:${var.expected_account_id}:project/${local.staging_name}"
}
resource "aws_cloudwatch_log_group" "staging_lambda" {
  count             = local.staging_count
  name              = "/aws/lambda/${local.staging_name}"
  retention_in_days = 7
}
resource "aws_iam_role" "staging_lambda" {
  count = local.staging_count
  name  = "${local.staging_name}-lambda"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}
resource "aws_iam_role_policy" "staging_lambda" {
  count = local.staging_count
  name  = "own-log-streams-only"
  role  = aws_iam_role.staging_lambda[0].id
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.staging_lambda[0].arn}:*" }]
  })
}
resource "aws_lambda_function" "staging" {
  count                          = local.staging_count
  function_name                  = local.staging_name
  role                           = aws_iam_role.staging_lambda[0].arn
  runtime                        = "java21"
  architectures                  = ["x86_64"]
  handler                        = "dev.kongortfolio.lambda.PortfolioLambdaHandler::handleRequest"
  filename                       = var.staging_bootstrap_zip
  source_code_hash               = var.staging_bootstrap_zip == null ? null : filebase64sha256(var.staging_bootstrap_zip)
  publish                        = true
  memory_size                    = 1024
  timeout                        = 28
  reserved_concurrent_executions = 1
  tags                           = { Environment = "stg" }
  environment {
    variables = merge({ DEBUG = "false", MANAGEMENT_HEALTH_DISKSPACE_PATH = "/tmp" }, var.enable_staging_bedrock_qa ? {
      BEDROCK_ENABLED           = "true"
      BEDROCK_FACTS_BUCKET      = var.staging_bedrock_content.bucket
      BEDROCK_FACTS_OWNER       = var.staging_bedrock_content.owner
      BEDROCK_FACTS_VERSION     = var.staging_bedrock_content.version
      BEDROCK_FACTS_SHA256      = var.staging_bedrock_content.sha256
      BEDROCK_MAX_OUTPUT_TOKENS = tostring(var.staging_bedrock_max_output_tokens)
      BEDROCK_TIMEOUT_SECONDS   = "20"
    } : {})
  }
  lifecycle {
    # Deliberate ownership boundary: Terraform controls config; CI controls code.
    ignore_changes = [filename, source_code_hash]
    precondition {
      condition     = var.staging_bootstrap_zip == null ? false : try(filesha256(var.staging_bootstrap_zip) == var.staging_bootstrap_sha256, false)
      error_message = "Provide the verified local bootstrap ZIP and its matching manifest SHA256."
    }
  }
  depends_on = [aws_iam_role_policy.staging_lambda, aws_iam_role_policy.staging_bedrock]
}
resource "aws_cloudwatch_log_group" "staging_build" {
  count             = local.staging_count
  name              = "/aws/codebuild/${local.staging_name}"
  retention_in_days = 7
}
resource "aws_iam_role" "staging_build" {
  count = local.staging_count
  name  = "${local.staging_name}-build"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow", Principal = { Service = "codebuild.amazonaws.com" }, Action = "sts:AssumeRole"
      Condition = {
        StringEquals = { "aws:SourceAccount" = var.expected_account_id }
        ArnEquals    = { "aws:SourceArn" = local.staging_project_arn }
      }
    }]
  })
}
resource "aws_iam_role_policy" "staging_build" {
  count = local.staging_count
  name  = "verify-stg-only"
  role  = aws_iam_role.staging_build[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.staging_build[0].arn}:*" },
      { Effect = "Allow", Action = ["s3:GetBucketAcl", "s3:GetBucketLocation"], Resource = aws_s3_bucket.artifacts[0].arn },
      { Effect = "Allow", Action = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject"], Resource = "${aws_s3_bucket.artifacts[0].arn}/${local.candidate_artifact_prefix}/*" },
      {
        Effect    = "Allow", Action = ["codeconnections:UseConnection"], Resource = aws_codeconnections_connection.github.arn
        Condition = { StringEquals = { "codeconnections:FullRepositoryId" = "konglingtong44/kongPortfolio" } }
      },
      {
        Effect   = "Allow", Action = ["lambda:GetFunctionConfiguration", "lambda:UpdateFunctionCode", "lambda:PublishVersion", "lambda:ListVersionsByFunction"]
        Resource = local.staging_arn
      },
      { Effect = "Allow", Action = ["lambda:GetFunctionConfiguration", "lambda:InvokeFunction"], Resource = "${local.staging_arn}:*" }
    ]
  })
}
resource "aws_codebuild_project" "staging" {
  count                  = local.staging_count
  name                   = local.staging_name
  service_role           = aws_iam_role.staging_build[0].arn
  build_timeout          = 10
  queued_timeout         = 5
  concurrent_build_limit = 1
  auto_retry_limit       = 0
  artifacts { type = "CODEPIPELINE" }
  source {
    type      = "CODEPIPELINE"
    buildspec = "codebuild/staging.yml"
  }
  environment {
    type                        = "LINUX_CONTAINER"
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux-x86_64-standard:5.0"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = false
    environment_variable {
      name  = "STAGING_ACCOUNT_ID"
      value = var.expected_account_id
    }
    environment_variable {
      name  = "STAGING_FUNCTION_NAME"
      value = local.staging_name
    }
  }
  logs_config {
    cloudwatch_logs {
      status     = "ENABLED"
      group_name = aws_cloudwatch_log_group.staging_build[0].name
    }
    s3_logs { status = "DISABLED" }
  }
  depends_on = [aws_iam_role_policy.staging_build, aws_lambda_function.staging]
}
