mock_provider "aws" {
  mock_data "aws_lambda_alias" { defaults = { function_version = "18" } }
}
variables {
  custom_domain                = null
  expected_account_id          = "123456789012"
  enable_bedrock_access         = false
  enable_bedrock_qa             = false
  pipeline_owns_lambda_versions = false
  bedrock_content              = null
}

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

run "production_qa_pins_content_without_publishing_or_moving_live" {
  command = plan
  variables {
    pipeline_owns_lambda_versions = true
    enable_bedrock_access         = true
    enable_bedrock_qa             = true
    bedrock_content = {
      bucket  = "kongportfolio-content-${var.expected_account_id}-ap-northeast-1"
      owner   = var.expected_account_id
      version = "approved-v3"
      sha256  = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }
  }
  assert {
    condition     = !aws_lambda_function.api.publish && aws_lambda_alias.live.function_version == "18"
    error_message = "Configuration updates must not publish Green or move live before pipeline approval."
  }
  assert {
    condition = aws_lambda_function.api.environment[0].variables == tomap({
      DEBUG = "false", MANAGEMENT_HEALTH_DISKSPACE_PATH = "/tmp", BEDROCK_ENABLED = "true",
      BEDROCK_FACTS_BUCKET = "kongportfolio-content-${var.expected_account_id}-ap-northeast-1", BEDROCK_FACTS_OWNER = var.expected_account_id,
      BEDROCK_FACTS_VERSION = "approved-v3", BEDROCK_FACTS_SHA256 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      BEDROCK_MAX_OUTPUT_TOKENS = "1024", BEDROCK_TIMEOUT_SECONDS = "15"
    })
    error_message = "Production must pin the exact approved content and bounded generation parameters."
  }
}

run "reject_qa_without_model_permission" {
  command = plan
  variables { enable_bedrock_qa = true }
  expect_failures = [var.enable_bedrock_qa]
}

run "reject_qa_without_pinned_content" {
  command = plan
  variables {
    enable_bedrock_access         = true
    enable_bedrock_qa             = true
    pipeline_owns_lambda_versions = true
  }
  expect_failures = [var.enable_bedrock_qa]
}

run "reject_qa_that_would_publish_before_first_approval" {
  command = plan
  variables {
    enable_bedrock_access = true
    enable_bedrock_qa     = true
    bedrock_content = {
      bucket = "kongportfolio-content-${var.expected_account_id}-ap-northeast-1", owner = var.expected_account_id,
      version = "approved-v3", sha256 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }
  }
  expect_failures = [var.enable_bedrock_qa]
}

run "reject_wrong_account_content" {
  command = plan
  variables {
    bedrock_content = {
      bucket = "wrong-account", owner = "999999999999", version = "approved-v3",
      sha256 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }
  }
  expect_failures = [var.bedrock_content]
}

run "reject_large_production_output" {
  command = plan
  variables { bedrock_max_output_tokens = 2048 }
  expect_failures = [var.bedrock_max_output_tokens]
}

run "reject_long_production_timeout" {
  command = plan
  variables { bedrock_timeout_seconds = 20 }
  expect_failures = [var.bedrock_timeout_seconds]
}
