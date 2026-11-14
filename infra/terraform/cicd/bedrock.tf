variable "enable_staging_bedrock_access" {
  type        = bool
  default     = false
  description = "Opt in to selected Qwen via Tokyo Mantle default project on the STG Lambda role, never a build role."
  validation {
    condition     = !var.enable_staging_bedrock_access || var.enable_staging
    error_message = "Bedrock STG access requires the existing STG Lambda."
  }
}

variable "enable_staging_bedrock_qa" {
  type        = bool
  default     = false
  description = "Enable bounded Q&A only on STG after reviewing model permission and the pinned facts version."
  validation {
    condition     = !var.enable_staging_bedrock_qa || (var.enable_staging_bedrock_access && var.staging_bedrock_content != null)
    error_message = "STG Q&A requires model access and a pinned approved content version."
  }
}

variable "staging_bedrock_content" {
  type    = object({ bucket = string, owner = string, version = string, sha256 = string })
  default = null
  validation {
    condition = var.staging_bedrock_content == null ? true : (
      var.staging_bedrock_content.bucket == "kongportfolio-content-${var.expected_account_id}-ap-northeast-1" &&
      var.staging_bedrock_content.owner == var.expected_account_id &&
      length(trimspace(var.staging_bedrock_content.version)) > 0 && var.staging_bedrock_content.version != "null" &&
      can(regex("^[0-9a-f]{64}$", var.staging_bedrock_content.sha256))
    )
    error_message = "Use this account's Tokyo content bucket with a real version and SHA-256."
  }
}

variable "staging_bedrock_max_output_tokens" {
  type    = number
  default = 1024
  validation {
    condition     = floor(var.staging_bedrock_max_output_tokens) == var.staging_bedrock_max_output_tokens && var.staging_bedrock_max_output_tokens >= 16 && var.staging_bedrock_max_output_tokens <= 2048
    error_message = "STG output limit must be an integer between 16 and 2048."
  }
}

resource "aws_iam_role_policy" "staging_bedrock" {
  count = var.enable_staging_bedrock_access ? 1 : 0
  name  = "qwen-235b-mantle-tokyo-only"
  role  = aws_iam_role.staging_lambda[0].id
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
