mock_provider "aws" {}
variables {
  expected_account_id       = "123456789012"
  enable_ci                 = false
  enable_ci_webhooks        = false
  enable_candidate_pipeline = false
  enable_staging            = false
}

run "webhooks_default_off" {
  command = plan
  variables { enable_ci = true }
  assert {
    condition     = length(aws_codebuild_webhook.ci) == 0
    error_message = "Existing projects must not subscribe to events without opt-in."
  }
}

run "only_trusted_actor_and_branches_trigger" {
  command = plan
  variables {
    enable_ci          = true
    enable_ci_webhooks = true
  }
  assert {
    condition     = length(aws_codebuild_webhook.ci) == 2
    error_message = "Both components need stable independent build results."
  }
  assert {
    condition     = length(aws_codebuild_source_credential.github) == 1 && aws_codebuild_source_credential.github[0].auth_type == "CODECONNECTIONS" && aws_codebuild_source_credential.github[0].server_type == "GITHUB"
    error_message = "Provider operations must reuse the GitHub connection, not a personal access token."
  }
  assert {
    condition = alltrue(flatten([for hook in aws_codebuild_webhook.ci : [
      for group in hook.filter_group : length([for filter in group.filter : filter if filter.type == "ACTOR_ACCOUNT_ID" && filter.pattern == "^14041257$" && !coalesce(filter.exclude_matched_pattern, false)]) == 1
    ]]))
    error_message = "Every OR filter group must require an exact trusted actor match."
  }
  assert {
    condition = alltrue([
      can(regex(local.ci_branch_pattern, "refs/heads/main")),
      can(regex(local.ci_branch_pattern, "refs/heads/feat/aws-serverless-ci")),
      !can(regex(local.ci_branch_pattern, "refs/tags/v1")),
      !can(regex(local.ci_branch_pattern, "refs/heads/main-evil")),
      !can(regex(local.ci_branch_pattern, "prefix/refs/heads/main"))
    ])
    error_message = "Branch filters must be anchored and reject tags and lookalikes."
  }
}

run "webhooks_cannot_exist_without_projects" {
  command = plan
  variables { enable_ci_webhooks = true }
  expect_failures = [var.enable_ci_webhooks]
}
