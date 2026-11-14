mock_provider "aws" {}
variables {
  custom_domain                = null
  enable_bedrock_access         = false
  enable_bedrock_qa             = false
  pipeline_owns_lambda_versions = false
  bedrock_content              = null
}

run "qa_route_has_own_throttle_without_enabling_model" {
  command = plan
  assert {
    condition     = toset(keys(aws_apigatewayv2_route.api)) == toset(["ANY /api", "ANY /api/{proxy+}", "POST /api/bedrock"])
    error_message = "Add the explicit question route while preserving the existing API routes."
  }
  assert {
    condition     = length(aws_apigatewayv2_stage.live.route_settings) == 1 && alltrue([for s in aws_apigatewayv2_stage.live.route_settings : s.route_key == "POST /api/bedrock" && s.throttling_burst_limit == 1 && s.throttling_rate_limit == 0.1 && !s.detailed_metrics_enabled])
    error_message = "Only Q&A should receive the reviewed 0.1/s burst-one throttle, without paid detailed metrics."
  }
  assert {
    condition     = aws_apigatewayv2_stage.live.default_route_settings[0].throttling_rate_limit == 1 && aws_apigatewayv2_stage.live.default_route_settings[0].throttling_burst_limit == 5
    error_message = "Profile, health and the question catalog must retain the existing defaults."
  }
  assert {
    condition     = aws_lambda_function.api.reserved_concurrent_executions == 5 && length(aws_iam_role_policy.bedrock) == 0 && !contains(keys(aws_lambda_function.api.environment[0].variables), "BEDROCK_ENABLED")
    error_message = "Throttle preparation must not enable model access or change shared Lambda concurrency."
  }
}
