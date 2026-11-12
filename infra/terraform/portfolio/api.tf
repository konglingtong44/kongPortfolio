resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = 7
}

resource "aws_iam_role" "lambda" {
  name = "${local.name}-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "logs" {
  name = "own-log-streams-only"
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "${aws_cloudwatch_log_group.lambda.arn}:*"
    }]
  })
}

resource "aws_lambda_function" "api" {
  function_name                  = local.name
  role                           = aws_iam_role.lambda.arn
  runtime                        = "java21"
  architectures                  = ["x86_64"]
  handler                        = "dev.kongortfolio.lambda.PortfolioLambdaHandler::handleRequest"
  filename                       = local.zip_path
  source_code_hash               = filebase64sha256(local.zip_path)
  memory_size                    = 1024
  timeout                        = 28
  reserved_concurrent_executions = 5
  publish                        = true
  environment {
    variables = {
      DEBUG                            = "false"
      MANAGEMENT_HEALTH_DISKSPACE_PATH = "/tmp"
    }
  }
  depends_on = [aws_iam_role_policy.logs]
  lifecycle {
    # The release pipeline owns code after the reviewed Green handoff.
    # Terraform still owns runtime, execution role, memory and environment.
    ignore_changes = [filename, source_code_hash]
    precondition {
      condition     = filesha256(local.zip_path) == local.release.backend.sha256 && can(regex("^[0-9a-f]{64}$", local.release.releaseId)) && local.release.schemaVersion == 1 && local.release.kind == "first-release-candidate"
      error_message = "The release manifest or Lambda ZIP is invalid; regenerate the plan."
    }
  }
}

# Release ownership boundary: only the later, twice-approved CodeDeploy stage
# may change live's version/weights. Publishing Green must not move this alias.
resource "aws_lambda_alias" "live" {
  name             = "live"
  function_name    = aws_lambda_function.api.function_name
  function_version = aws_lambda_function.api.version
  lifecycle {
    ignore_changes = [function_version, routing_config]
  }
}

resource "aws_apigatewayv2_api" "api" {
  name          = local.name
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_alias.live.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "api" {
  for_each  = toset(["ANY /api", "ANY /api/{proxy+}"])
  api_id    = aws_apigatewayv2_api.api.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_lambda_permission" "api" {
  for_each      = { root = "/api", proxy = "/api/*" }
  statement_id  = "HttpApi-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  qualifier     = aws_lambda_alias.live.name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*${each.value}"
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/apigateway/${local.name}"
  retention_in_days = 7
}

resource "aws_apigatewayv2_stage" "live" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
  default_route_settings {
    throttling_burst_limit = 5
    throttling_rate_limit  = 1
  }
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    # Never include bodies, query strings, authorization, IPs or subscriber data.
    format = jsonencode({
      requestId      = "$context.requestId"
      method         = "$context.httpMethod"
      route          = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
    })
  }
  depends_on = [aws_lambda_permission.api, aws_apigatewayv2_route.api]
}
