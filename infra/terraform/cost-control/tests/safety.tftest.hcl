mock_provider "aws" {}
mock_provider "archive" {}
variables {
  expected_account_id = "561798268037"
  notification_email  = "operator@example.com"
}
run "unarmed_by_default" {
  command = plan
  assert {
    condition     = length(aws_budgets_budget.threshold) == 4 && length(aws_sns_topic_subscription.budget) == 0
    error_message = "Four independent budgets must exist without automatic invocation by default."
  }
  assert {
    condition     = aws_lambda_function.controller.reserved_concurrent_executions == 1
    error_message = "All manual and automated changes must be serialized."
  }
  assert {
    condition     = contains(local.pipeline_stage_access.Action, "codepipeline:DisableStageTransition") && contains(local.pipeline_stage_access.Resource, "arn:aws:codepipeline:ap-northeast-1:561798268037:kongportfolio-candidate/*")
    error_message = "Stage transition permissions require stage ARNs, not just the pipeline ARN."
  }
  assert {
    condition     = alltrue([for b in aws_budgets_budget.threshold : b.time_unit == "MONTHLY" && b.cost_types[0].include_tax && !b.cost_types[0].include_credit])
    error_message = "Monthly gross costs must include taxes and exclude credits."
  }
}
run "explicit_arming" {
  command = plan
  variables { arm_notifications = true }
  assert {
    condition     = length(aws_sns_topic_subscription.budget) == 4 && length(aws_lambda_permission.budget) == 4
    error_message = "Each threshold requires its own restricted subscription."
  }
}
