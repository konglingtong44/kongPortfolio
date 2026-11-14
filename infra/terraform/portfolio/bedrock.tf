variable "enable_bedrock_access" {
  type        = bool
  default     = false
  description = "Opt in to selected Qwen via Tokyo Mantle default project only; application remains separate."
}

variable "pipeline_owns_lambda_versions" {
  type        = bool
  default     = false
  description = "After CI/CD handoff, update only LATEST configuration; the approved pipeline publishes versions. Requires an existing live alias."
}

data "aws_lambda_alias" "current_live" {
  count         = var.pipeline_owns_lambda_versions ? 1 : 0
  function_name = local.name
  name          = "live"
}

variable "enable_bedrock_qa" {
  type    = bool
  default = false
  validation {
    condition     = !var.enable_bedrock_qa || (var.enable_bedrock_access && var.pipeline_owns_lambda_versions && var.bedrock_content != null)
    error_message = "Q&A requires model access, pinned approved content and pipeline ownership of version publishing."
  }
}

variable "bedrock_content" {
  type    = object({ bucket = string, owner = string, version = string, sha256 = string })
  default = null
  validation {
    condition = var.bedrock_content == null ? true : (
      var.bedrock_content.bucket == "kongportfolio-content-${var.expected_account_id}-ap-northeast-1" &&
      var.bedrock_content.owner == var.expected_account_id &&
      length(trimspace(var.bedrock_content.version)) > 0 && var.bedrock_content.version != "null" &&
      can(regex("^[0-9a-f]{64}$", var.bedrock_content.sha256))
    )
    error_message = "Use this account's Tokyo approved content bucket, immutable version and SHA-256."
  }
}

variable "bedrock_max_output_tokens" {
  type    = number
  default = 1024
  validation {
    condition     = floor(var.bedrock_max_output_tokens) == var.bedrock_max_output_tokens && var.bedrock_max_output_tokens >= 16 && var.bedrock_max_output_tokens <= 1024
    error_message = "Production output must be an integer between 16 and 1024 tokens."
  }
}

variable "bedrock_timeout_seconds" {
  type    = number
  default = 15
  validation {
    condition     = floor(var.bedrock_timeout_seconds) == var.bedrock_timeout_seconds && var.bedrock_timeout_seconds >= 1 && var.bedrock_timeout_seconds <= 15
    error_message = "Production model HTTP timeout must be an integer from 1 to 15 seconds, leaving room for S3 and initialization."
  }
}

resource "aws_iam_role_policy" "bedrock" {
  count = var.enable_bedrock_access ? 1 : 0
  name  = "qwen-235b-mantle-tokyo-only"
  role  = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["bedrock-mantle:CreateInference"]
      Resource = "arn:aws:bedrock-mantle:ap-northeast-1:${var.expected_account_id}:project/default"
      Condition = {
        StringEquals = { "bedrock-mantle:Model" = "qwen.qwen3-235b-a22b-2507" }
      }
    }]
  })
}
