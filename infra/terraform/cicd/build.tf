variable "enable_ci" {
  description = "Create the reviewed, billable CodeBuild CI resources only after approval."
  type        = bool
  default     = false
}

locals {
  components = var.enable_ci ? toset(["frontend", "backend"]) : toset([])
}

resource "aws_cloudwatch_log_group" "ci" {
  for_each          = local.components
  name              = "/aws/codebuild/kongportfolio-ci-${each.key}"
  retention_in_days = 7
}

resource "aws_iam_role" "ci" {
  for_each = local.components
  name     = "kongportfolio-ci-${each.key}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = { "aws:SourceAccount" = var.expected_account_id }
        ArnEquals = {
          "aws:SourceArn" = "arn:aws:codebuild:ap-northeast-1:${var.expected_account_id}:project/kongportfolio-ci-${each.key}"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "ci" {
  for_each = local.components
  name     = "source-and-own-logs-only"
  role     = aws_iam_role.ci[each.key].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["codeconnections:GetConnectionToken", "codeconnections:GetConnection"]
        Resource = aws_codeconnections_connection.github.arn
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.ci[each.key].arn}:*"
      }
    ]
  })
}

resource "aws_codebuild_project" "ci" {
  for_each               = local.components
  name                   = "kongportfolio-ci-${each.key}"
  description            = "${each.key} verification only; no deployment permissions"
  service_role           = aws_iam_role.ci[each.key].arn
  build_timeout          = 15
  queued_timeout         = 5
  concurrent_build_limit = 1
  auto_retry_limit       = 0
  project_visibility     = "PRIVATE"
  source_version         = "refs/heads/main"
  artifacts { type = "NO_ARTIFACTS" }
  environment {
    type                        = "LINUX_CONTAINER"
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux-x86_64-standard:5.0"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = false
    environment_variable {
      name  = "CI_COMPONENT"
      value = each.key
    }
    environment_variable {
      name  = "DEBUG"
      value = "false"
    }
  }
  source {
    type                = "GITHUB"
    location            = "https://github.com/konglingtong44/kongPortfolio.git"
    buildspec           = "codebuild/ci.yml"
    git_clone_depth     = 0
    report_build_status = true
    git_submodules_config { fetch_submodules = false }
    auth {
      type     = "CODECONNECTIONS"
      resource = aws_codeconnections_connection.github.arn
    }
    build_status_config {
      context = "ci/${each.key}"
    }
  }
  logs_config {
    cloudwatch_logs {
      status     = "ENABLED"
      group_name = aws_cloudwatch_log_group.ci[each.key].name
    }
    s3_logs { status = "DISABLED" }
  }
  depends_on = [aws_iam_role_policy.ci]
}

output "ci_project_names" {
  value = var.enable_ci ? { for component, project in aws_codebuild_project.ci : component => project.name } : null
}
