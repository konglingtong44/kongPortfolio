mock_provider "aws" {}
variables {
  expected_account_id       = "123456789012"
  enable_ci                 = false
  enable_ci_webhooks        = false
  enable_candidate_pipeline = false
}

run "candidate_default_off" {
  command = plan
  assert {
    condition     = length(aws_codepipeline.candidate) == 0 && length(aws_s3_bucket.artifacts) == 0 && length(aws_codebuild_project.candidate) == 0
    error_message = "Candidate resources require explicit opt-in."
  }
}

run "candidate_only_no_production_deployment" {
  command = plan
  variables { enable_candidate_pipeline = true }
  override_resource {
    override_during = plan
    target          = aws_codeconnections_connection.github
    values          = { arn = "arn:aws:codeconnections:ap-northeast-1:123456789012:connection/example" }
  }
  override_resource {
    override_during = plan
    target          = aws_s3_bucket.artifacts[0]
    values          = { arn = "arn:aws:s3:::candidate-test", id = "candidate-test" }
  }
  override_resource {
    override_during = plan
    target          = aws_cloudwatch_log_group.candidate[0]
    values          = { arn = "arn:aws:logs:ap-northeast-1:123456789012:log-group:/aws/codebuild/kongportfolio-candidate" }
  }
  assert {
    condition     = aws_codepipeline.candidate[0].pipeline_type == "V2" && aws_codepipeline.candidate[0].execution_mode == "QUEUED" && length(aws_codepipeline.candidate[0].stage) == 2 && aws_codepipeline.candidate[0].stage[0].action[0].configuration["DetectChanges"] == "false" && aws_codepipeline.candidate[0].stage[0].action[0].configuration["OutputArtifactFormat"] == "CODEBUILD_CLONE_REF"
    error_message = "Use manual V2 execution, full clone, and only Source/Build stages."
  }
  assert {
    condition = alltrue([for policy in [aws_iam_role_policy.candidate_build[0], aws_iam_role_policy.candidate_pipeline[0]] : alltrue([
      for statement in jsondecode(policy.policy).Statement : alltrue([for action in statement.Action : contains(["logs:CreateLogStream", "logs:PutLogEvents", "s3:GetBucketVersioning", "s3:GetBucketAcl", "s3:GetBucketLocation", "s3:GetObject", "s3:GetObjectVersion", "s3:PutObject", "codeconnections:UseConnection", "codestar-connections:UseConnection", "codebuild:StartBuild", "codebuild:BatchGetBuilds"], action)])
    ])])
    error_message = "Candidate roles must not gain deployment, Terraform state, IAM or Bedrock actions."
  }
  assert {
    condition = alltrue([for policy in [aws_iam_role_policy.candidate_build[0], aws_iam_role_policy.candidate_pipeline[0]] : alltrue([
      for statement in jsondecode(policy.policy).Statement : statement.Resource == "arn:aws:s3:::candidate-test/kongportfolio-candid/*" if contains(statement.Action, "s3:PutObject")
    ])]) && aws_s3_bucket_lifecycle_configuration.artifacts[0].rule[0].filter[0].prefix == "kongportfolio-candid/"
    error_message = "IAM and retention must match the actual truncated pipeline artifact prefix."
  }
  assert {
    condition     = aws_codebuild_project.candidate[0].build_timeout == 15 && aws_codebuild_project.candidate[0].concurrent_build_limit == 1 && !aws_codebuild_project.candidate[0].environment[0].privileged_mode && aws_s3_bucket_public_access_block.artifacts[0].block_public_policy && aws_s3_bucket_public_access_block.artifacts[0].restrict_public_buckets && aws_s3_bucket_versioning.artifacts[0].versioning_configuration[0].status == "Enabled"
    error_message = "Preserve bounded build capacity and private versioned artifacts."
  }
}
