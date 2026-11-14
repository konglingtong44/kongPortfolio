mock_provider "aws" {}
variables { custom_domain = null }

run "bedrock_default_off" {
  command = plan
  variables { enable_bedrock_access = false }
  assert {
    condition     = length(aws_iam_role_policy.bedrock) == 0
    error_message = "Bedrock permission must require opt-in."
  }
}

run "bedrock_mantle_one_model_default_project" {
  command = plan
  variables { enable_bedrock_access = true }
  assert {
    condition = jsondecode(aws_iam_role_policy.bedrock[0].policy) == {
      Version = "2012-10-17"
      Statement = [{
        Effect    = "Allow"
        Action    = ["bedrock-mantle:CreateInference"]
        Resource  = "arn:aws:bedrock-mantle:ap-northeast-1:${var.expected_account_id}:project/default"
        Condition = { StringEquals = { "bedrock-mantle:Model" = "qwen.qwen3-235b-a22b-2507" } }
      }]
    }
    error_message = "Only selected Qwen inference on this account's Tokyo Mantle default project may be granted."
  }
}
