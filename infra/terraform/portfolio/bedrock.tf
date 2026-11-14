variable "enable_bedrock_access" {
  type        = bool
  default     = false
  description = "Opt in to selected Qwen via Tokyo Mantle default project only; application remains separate."
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
