terraform {
  required_version = ">= 1.10, < 2.0"
  backend "s3" {}
  required_providers {
    aws     = { source = "hashicorp/aws", version = "~> 6.0" }
    archive = { source = "hashicorp/archive", version = "~> 2.7" }
  }
}

provider "aws" {
  region              = "ap-northeast-1"
  allowed_account_ids = [var.expected_account_id]
  default_tags {
    tags = { Project = "kongPortfolio", Purpose = "cost-control", ManagedBy = "Terraform" }
  }
}

variable "expected_account_id" {
  type = string
  validation {
    condition     = can(regex("^[0-9]{12}$", var.expected_account_id))
    error_message = "Provide the reviewed account ID."
  }
}
variable "arm_notifications" {
  description = "Enable only AFTER initialize and verification of budget current-month costs."
  type        = bool
  default     = false
}
variable "notification_email" {
  description = "Operator email; confirm the SNS subscription after deployment."
  type        = string
  sensitive   = true
}
variable "distribution_ids" {
  description = "Reviewed live portfolio distribution only; legacy practice sites were retired."
  type        = set(string)
  default     = ["E2NYEXSOAQ1TWE"]
}

locals {
  pipeline_stage_access = {
    Effect   = "Allow", Action = ["codepipeline:DisableStageTransition", "codepipeline:EnableStageTransition"],
    Resource = [for n in local.pipelines : "arn:aws:codepipeline:ap-northeast-1:${var.expected_account_id}:${n}/*"]
  }
  name      = "kongportfolio-cost-control"
  functions = ["kongportfolio-prod", "kongportfolio-stg"]
  roles     = ["kongportfolio-prod-lambda", "kongportfolio-stg-lambda"]
  pipelines = ["kongportfolio-candidate"]
  webhooks  = ["kongportfolio-ci-backend", "kongportfolio-ci-frontend"]
  projects  = ["kongportfolio-ci-backend", "kongportfolio-ci-frontend", "kongportfolio-candidate", "kongportfolio-stg", "kongportfolio-green", "kongportfolio-deploy", "kongportfolio-frontend-release"]
  arn       = "arn:aws"
}

resource "aws_s3_bucket" "state" {
  bucket = "${local.name}-${var.expected_account_id}-ap-northeast-1"
  lifecycle { prevent_destroy = true }
}
resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.state.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect    = "Deny", Principal = "*", Action = "s3:*",
    Resource  = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"],
    Condition = { Bool = { "aws:SecureTransport" = "false" } }
  }] })
}
resource "aws_s3_bucket_lifecycle_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    id     = "old-snapshots-only"
    status = "Enabled"
    filter { prefix = "controller/" }
    noncurrent_version_expiration { noncurrent_days = 90 }
  }
  depends_on = [aws_s3_bucket_versioning.state]
}

resource "aws_sns_topic" "threshold" {
  for_each = toset(["5", "10", "15", "25"])
  name     = "${local.name}-${each.key}"
}
resource "aws_sns_topic_policy" "threshold" {
  for_each = aws_sns_topic.threshold
  arn      = each.value.arn
  policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect = "Allow", Principal = { Service = "budgets.amazonaws.com" },
    Action = "SNS:Publish", Resource = each.value.arn,
    Condition = {
      StringEquals = { "aws:SourceAccount" = var.expected_account_id },
      ArnLike      = { "aws:SourceArn" = "arn:aws:budgets::${var.expected_account_id}:*" }
    }
  }] })
}
resource "aws_budgets_budget" "threshold" {
  for_each     = aws_sns_topic.threshold
  account_id   = var.expected_account_id
  name         = "portfolio-stop-${each.key}"
  budget_type  = "COST"
  limit_amount = each.key
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  cost_types {
    include_credit             = false
    include_refund             = false
    include_tax                = true
    include_upfront            = true
    include_recurring          = true
    include_subscription       = true
    include_support            = true
    include_other_subscription = true
    use_blended                = false
  }
  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [each.value.arn]
  }
  depends_on = [aws_sns_topic_policy.threshold]
}

resource "aws_sns_topic" "results" { name = "${local.name}-results" }
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.results.arn
  protocol  = "email"
  endpoint  = var.notification_email
}
resource "aws_sqs_queue" "failures" {
  name                      = "${local.name}-failures"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}
resource "aws_cloudwatch_log_group" "controller" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = 14
}
resource "aws_iam_role" "controller" {
  name = local.name
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole"
  }] })
}
resource "aws_iam_role_policy" "controller" {
  role = aws_iam_role.controller.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["s3:GetObject", "s3:PutObject"], Resource = "${aws_s3_bucket.state.arn}/controller/state.json" },
    { Effect = "Allow", Action = "s3:ListBucket", Resource = aws_s3_bucket.state.arn },
    { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.controller.arn}:*" },
    { Effect = "Allow", Action = ["budgets:ViewBudget"], Resource = "arn:aws:budgets::${var.expected_account_id}:budget/portfolio-stop-*" },
    { Effect = "Allow", Action = ["lambda:GetFunctionConcurrency", "lambda:PutFunctionConcurrency", "lambda:DeleteFunctionConcurrency"], Resource = [for n in local.functions : "arn:aws:lambda:ap-northeast-1:${var.expected_account_id}:function:${n}"] },
    { Effect = "Allow", Action = ["iam:GetRolePolicy", "iam:PutRolePolicy", "iam:DeleteRolePolicy"], Resource = [for n in local.roles : "arn:aws:iam::${var.expected_account_id}:role/${n}"] },
    { Effect = "Allow", Action = ["cloudfront:GetDistributionConfig", "cloudfront:UpdateDistribution"], Resource = [for n in var.distribution_ids : "arn:aws:cloudfront::${var.expected_account_id}:distribution/${n}"] },
    { Effect = "Allow", Action = ["codepipeline:GetPipelineState", "codepipeline:ListPipelineExecutions", "codepipeline:StopPipelineExecution"], Resource = [for n in local.pipelines : "arn:aws:codepipeline:ap-northeast-1:${var.expected_account_id}:${n}"] },
    local.pipeline_stage_access,
    { Effect = "Allow", Action = ["codebuild:BatchGetProjects", "codebuild:ListBuildsForProject", "codebuild:UpdateWebhook"], Resource = [for n in local.projects : "arn:aws:codebuild:ap-northeast-1:${var.expected_account_id}:project/${n}"] },
    { Effect = "Allow", Action = ["codebuild:BatchGetBuilds", "codebuild:StopBuild"], Resource = [for n in local.projects : "arn:aws:codebuild:ap-northeast-1:${var.expected_account_id}:project/${n}"] },
    { Effect = "Allow", Action = "sns:Publish", Resource = aws_sns_topic.results.arn },
    { Effect = "Allow", Action = "sqs:SendMessage", Resource = aws_sqs_queue.failures.arn }
  ] })
}
data "archive_file" "controller" {
  type        = "zip"
  source_file = "${path.module}/../../cost-control/controller.py"
  output_path = "${path.module}/controller.zip"
}
resource "aws_lambda_function" "controller" {
  function_name                  = local.name
  role                           = aws_iam_role.controller.arn
  runtime                        = "python3.13"
  handler                        = "controller.handler"
  filename                       = data.archive_file.controller.output_path
  source_code_hash               = data.archive_file.controller.output_base64sha256
  timeout                        = 300
  memory_size                    = 256
  reserved_concurrent_executions = 1
  dead_letter_config { target_arn = aws_sqs_queue.failures.arn }
  environment {
    variables = {
      STATE_BUCKET  = aws_s3_bucket.state.id
      RESULTS_TOPIC = aws_sns_topic.results.arn
      CONFIG = jsonencode({
        account       = var.expected_account_id, functions = local.functions, roles = local.roles,
        pipelines     = local.pipelines, projects = local.projects, webhooks = local.webhooks,
        distributions = sort(tolist(var.distribution_ids)),
        topics        = { for k, v in aws_sns_topic.threshold : v.arn => tonumber(k) }
      })
    }
  }
  depends_on = [aws_iam_role_policy.controller, aws_s3_bucket_versioning.state, aws_budgets_budget.threshold]
}
resource "aws_lambda_permission" "budget" {
  for_each       = var.arm_notifications ? aws_sns_topic.threshold : {}
  statement_id   = "Budget${each.key}"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.controller.function_name
  principal      = "sns.amazonaws.com"
  source_arn     = each.value.arn
  source_account = var.expected_account_id
}
resource "aws_sns_topic_subscription" "budget" {
  for_each       = var.arm_notifications ? aws_sns_topic.threshold : {}
  topic_arn      = each.value.arn
  protocol       = "lambda"
  endpoint       = aws_lambda_function.controller.arn
  redrive_policy = jsonencode({ deadLetterTargetArn = aws_sqs_queue.failures.arn })
  depends_on     = [aws_lambda_permission.budget, aws_sqs_queue_policy.failures]
}
resource "aws_sqs_queue_policy" "failures" {
  queue_url = aws_sqs_queue.failures.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect    = "Allow", Principal = { Service = "sns.amazonaws.com" }, Action = "sqs:SendMessage",
    Resource  = aws_sqs_queue.failures.arn,
    Condition = { ArnEquals = { "aws:SourceArn" = [for t in aws_sns_topic.threshold : t.arn] } }
  }] })
}
resource "aws_cloudwatch_metric_alarm" "failures" {
  alarm_name          = "${local.name}-failed-events"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  dimensions          = { QueueName = aws_sqs_queue.failures.name }
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.results.arn]
}
output "controller_function" { value = aws_lambda_function.controller.function_name }
