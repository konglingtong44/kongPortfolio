# Console-compatible shared test events. No event invokes the function on creation.
# The account/region registry is shared with other Lambda functions: retain it.
resource "aws_schemas_registry" "lambda_tests" {
  name        = "lambda-testevent-schemas"
  description = "Shared test events used by the Lambda console"
  lifecycle { prevent_destroy = true }
}

resource "aws_schemas_schema" "console_controls" {
  name          = "_${aws_lambda_function.controller.function_name}-schema"
  registry_name = aws_schemas_registry.lambda_tests.name
  type          = "OpenApi3"
  description   = "Manual stop, start and status controls for portfolio services"
  content = jsonencode({
    openapi = "3.0.0"
    info    = { title = "Event", version = "1.0.0" }
    paths   = {}
    components = {
      schemas = {
        Event = {
          type       = "object"
          required   = ["action"]
          properties = { action = { type = "string", enum = ["off", "on", "status"] } }
        }
      }
      examples = {
        check-status = {
          value      = { action = "status" }
          x-metadata = { invocationType = "RequestResponse" }
        }
        manual-start = {
          value      = { action = "on" }
          x-metadata = { invocationType = "RequestResponse" }
        }
        manual-stop = {
          value      = { action = "off" }
          x-metadata = { invocationType = "RequestResponse" }
        }
      }
    }
  })
}
