variable "enable_ci_webhooks" {
  description = "Enable owner-only GitHub events after the initial builds pass."
  type        = bool
  default     = false
  validation {
    condition     = !var.enable_ci_webhooks || var.enable_ci
    error_message = "Enable CI projects before enabling their webhooks."
  }
}

variable "github_actor_id" {
  description = "Public numeric GitHub ID of the sole trusted build initiator."
  type        = string
  default     = "14041257"
  validation {
    condition     = can(regex("^[1-9][0-9]*$", var.github_actor_id))
    error_message = "Use a numeric GitHub account ID, not a login or regex."
  }
}

locals {
  ci_branch_pattern = "^refs/heads/(main|(feat|feature|fix|hotfix)/.+)$"
}

# This account/region previously had no GitHub default source credential.
# Reuse the existing connection for CodeBuild's provider-side operations;
# token is an ARN reference, never a personal access token or raw secret.
resource "aws_codebuild_source_credential" "github" {
  count       = var.enable_ci_webhooks ? 1 : 0
  auth_type   = "CODECONNECTIONS"
  server_type = "GITHUB"
  token       = aws_codeconnections_connection.github.arn
}

resource "aws_codebuild_webhook" "ci" {
  for_each     = var.enable_ci_webhooks ? local.components : toset([])
  project_name = aws_codebuild_project.ci[each.key].name
  build_type   = "BUILD"
  depends_on   = [aws_codebuild_source_credential.github]

  filter_group {
    filter {
      type    = "EVENT"
      pattern = "PUSH"
    }
    filter {
      type    = "ACTOR_ACCOUNT_ID"
      pattern = "^${var.github_actor_id}$"
    }
    filter {
      type    = "HEAD_REF"
      pattern = local.ci_branch_pattern
    }
  }

  # Updates to same-repository PR branches are covered by PUSH above. Do not
  # subscribe to PULL_REQUEST_UPDATED as well and pay for duplicate builds.
  filter_group {
    filter {
      type    = "EVENT"
      pattern = "PULL_REQUEST_CREATED,PULL_REQUEST_REOPENED"
    }
    filter {
      type    = "ACTOR_ACCOUNT_ID"
      pattern = "^${var.github_actor_id}$"
    }
    filter {
      type    = "BASE_REF"
      pattern = "^refs/heads/main$"
    }
    filter {
      type    = "HEAD_REF"
      pattern = "^refs/heads/(feat|feature|fix|hotfix)/.+$"
    }
  }
}
