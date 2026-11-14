mock_provider "aws" {}
variables {
  expected_account_id       = "123456789012"
  enable_ci                 = false
  enable_ci_webhooks        = false
  enable_candidate_pipeline = true
  enable_staging            = true
  enable_green              = false
  enable_deployment         = false
  enable_frontend_release   = false
  staging_bootstrap_zip     = "tests/fixtures/staging-bootstrap.txt"
  staging_bootstrap_sha256  = filesha256("tests/fixtures/staging-bootstrap.txt")
}
run "staging_bedrock_default_off" {
  command = plan
  assert {
    condition     = length(aws_iam_role_policy.staging_bedrock) == 0
    error_message = "STG Bedrock permission must require opt-in."
  }
  assert {
    condition     = !contains(keys(aws_lambda_function.staging[0].environment[0].variables), "BEDROCK_ENABLED")
    error_message = "Default STG configuration must not enable model invocation."
  }
}
run "staging_bedrock_one_model" {
  command = plan
  variables { enable_staging_bedrock_access = true }
  assert {
    condition = jsondecode(aws_iam_role_policy.staging_bedrock[0].policy) == {
      Version = "2012-10-17"
      Statement = [{
        Effect    = "Allow"
        Action    = ["bedrock-mantle:CreateInference"]
        Resource  = "arn:aws:bedrock-mantle:ap-northeast-1:${var.expected_account_id}:project/default"
        Condition = { StringEquals = { "bedrock-mantle:Model" = "qwen.qwen3-235b-a22b-2507" } }
      }]
    }
    error_message = "Grant only the selected Tokyo model permission."
  }
  assert {
    condition     = length(aws_codepipeline.candidate[0].stage) == 4 && aws_codepipeline.candidate[0].stage[3].action[0].provider == "Manual"
    error_message = "Existing approval stages must remain unchanged."
  }
}
run "bedrock_requires_staging" {
  command = plan
  variables {
    enable_staging                = false
    enable_staging_bedrock_access = true
  }
  expect_failures = [var.enable_staging_bedrock_access]
}

run "staging_qa_pins_content_and_limits" {
  command = plan
  variables {
    enable_staging_bedrock_access = true
    enable_staging_bedrock_qa     = true
    staging_bedrock_content = {
      bucket = "kongportfolio-content-123456789012-ap-northeast-1", owner = "123456789012"
      version = "reviewed-version", sha256 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }
  }
  assert {
    condition = aws_lambda_function.staging[0].environment[0].variables == tomap({
      DEBUG = "false", MANAGEMENT_HEALTH_DISKSPACE_PATH = "/tmp", BEDROCK_ENABLED = "true"
      BEDROCK_FACTS_BUCKET = "kongportfolio-content-123456789012-ap-northeast-1", BEDROCK_FACTS_OWNER = "123456789012"
      BEDROCK_FACTS_VERSION = "reviewed-version", BEDROCK_FACTS_SHA256 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      BEDROCK_MAX_OUTPUT_TOKENS = "1024", BEDROCK_TIMEOUT_SECONDS = "20"
    })
    error_message = "Enable only the pinned STG source with bounded output/time; never put the facts body in environment variables."
  }
}
run "qa_requires_permission_and_content" {
  command = plan
  variables { enable_staging_bedrock_qa = true }
  expect_failures = [var.enable_staging_bedrock_qa]
}
run "reject_cross_account_content" {
  command = plan
  variables {
    staging_bedrock_content = {
      bucket = "kongportfolio-content-999999999999-ap-northeast-1", owner = "999999999999"
      version = "v1", sha256 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }
  }
  expect_failures = [var.staging_bedrock_content]
}
