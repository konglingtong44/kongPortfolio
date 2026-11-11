variable "enable_candidate_pipeline" {
  description = "Opt in to the paid candidate-building pipeline after reviewing its plan."
  type        = bool
  default     = false
}

variable "candidate_source_branch" {
  description = "Practice branch until reviewed infrastructure is merged to main."
  type        = string
  default     = "feat/aws-serverless-ci"
  validation {
    condition     = can(regex("^(main|(feat|feature|fix|hotfix)/[A-Za-z0-9._/-]+)$", var.candidate_source_branch))
    error_message = "Choose main or a named practice branch."
  }
}

locals {
  candidate_count = var.enable_candidate_pipeline ? 1 : 0
  candidate_name  = "kongportfolio-candidate"
  # Observed Source artifact key: kongportfolio-candid/SourceRef/<id>.
  # CodePipeline truncates this pipeline's artifact prefix to 20 characters.
  candidate_artifact_prefix = substr(local.candidate_name, 0, 20)
  candidate_project_arn     = "arn:aws:codebuild:ap-northeast-1:${var.expected_account_id}:project/${local.candidate_name}"
}

resource "aws_s3_bucket" "artifacts" {
  count  = local.candidate_count
  bucket = "kongportfolio-artifacts-${var.expected_account_id}-ap-northeast-1"
  lifecycle { prevent_destroy = true }
}
resource "aws_s3_bucket_public_access_block" "artifacts" {
  count                   = local.candidate_count
  bucket                  = aws_s3_bucket.artifacts[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_ownership_controls" "artifacts" {
  count  = local.candidate_count
  bucket = aws_s3_bucket.artifacts[0].id
  rule { object_ownership = "BucketOwnerEnforced" }
}
resource "aws_s3_bucket_versioning" "artifacts" {
  count  = local.candidate_count
  bucket = aws_s3_bucket.artifacts[0].id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  count  = local.candidate_count
  bucket = aws_s3_bucket.artifacts[0].id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  count  = local.candidate_count
  bucket = aws_s3_bucket.artifacts[0].id
  rule {
    id     = "temporary-candidates"
    status = "Enabled"
    filter { prefix = "${local.candidate_artifact_prefix}/" }
    expiration { days = 30 }
    noncurrent_version_expiration { noncurrent_days = 7 }
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }
  depends_on = [aws_s3_bucket_versioning.artifacts]
}
resource "aws_s3_bucket_policy" "artifacts" {
  count  = local.candidate_count
  bucket = aws_s3_bucket.artifacts[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [aws_s3_bucket.artifacts[0].arn, "${aws_s3_bucket.artifacts[0].arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })
}

resource "aws_cloudwatch_log_group" "candidate" {
  count             = local.candidate_count
  name              = "/aws/codebuild/${local.candidate_name}"
  retention_in_days = 7
}
resource "aws_iam_role" "candidate_build" {
  count = local.candidate_count
  name  = "${local.candidate_name}-build"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow", Principal = { Service = "codebuild.amazonaws.com" }, Action = "sts:AssumeRole"
      Condition = {
        StringEquals = { "aws:SourceAccount" = var.expected_account_id }
        ArnEquals    = { "aws:SourceArn" = local.candidate_project_arn }
      }
    }]
  })
}
resource "aws_iam_role_policy" "candidate_build" {
  count = local.candidate_count
  name  = "build-candidates-only"
  role  = aws_iam_role.candidate_build[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.candidate[0].arn}:*"
      },
      {
        Effect   = "Allow", Action = ["s3:GetBucketAcl", "s3:GetBucketLocation"]
        Resource = aws_s3_bucket.artifacts[0].arn
      },
      {
        Effect   = "Allow", Action = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject"]
        Resource = "${aws_s3_bucket.artifacts[0].arn}/${local.candidate_artifact_prefix}/*"
      },
      {
        Effect    = "Allow", Action = ["codeconnections:UseConnection"]
        Resource  = aws_codeconnections_connection.github.arn
        Condition = { StringEquals = { "codeconnections:FullRepositoryId" = "konglingtong44/kongPortfolio" } }
      }
    ]
  })
}
resource "aws_codebuild_project" "candidate" {
  count                  = local.candidate_count
  name                   = local.candidate_name
  service_role           = aws_iam_role.candidate_build[0].arn
  build_timeout          = 15
  queued_timeout         = 5
  concurrent_build_limit = 1
  auto_retry_limit       = 0
  project_visibility     = "PRIVATE"
  artifacts { type = "CODEPIPELINE" }
  source {
    type      = "CODEPIPELINE"
    buildspec = "codebuild/candidate.yml"
  }
  environment {
    type                        = "LINUX_CONTAINER"
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux-x86_64-standard:5.0"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = false
    environment_variable {
      name  = "DEBUG"
      value = "false"
    }
  }
  logs_config {
    cloudwatch_logs {
      status     = "ENABLED"
      group_name = aws_cloudwatch_log_group.candidate[0].name
    }
    s3_logs { status = "DISABLED" }
  }
  depends_on = [aws_iam_role_policy.candidate_build]
}

resource "aws_iam_role" "candidate_pipeline" {
  count = local.candidate_count
  name  = "${local.candidate_name}-pipeline"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "codepipeline.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}
resource "aws_iam_role_policy" "candidate_pipeline" {
  count = local.candidate_count
  name  = "source-build-and-candidate-artifacts-only"
  role  = aws_iam_role.candidate_pipeline[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow", Action = ["s3:GetBucketVersioning", "s3:GetBucketAcl", "s3:GetBucketLocation"]
        Resource = aws_s3_bucket.artifacts[0].arn
      },
      {
        Effect   = "Allow", Action = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject"]
        Resource = "${aws_s3_bucket.artifacts[0].arn}/${local.candidate_artifact_prefix}/*"
      },
      {
        Effect   = "Allow", Action = ["codebuild:StartBuild", "codebuild:BatchGetBuilds"]
        Resource = local.candidate_project_arn
      },
      {
        # Source actions require both service prefixes. Restrict to the one
        # connection whose GitHub installation permits only kongPortfolio.
        Effect   = "Allow", Action = ["codeconnections:UseConnection", "codestar-connections:UseConnection"]
        Resource = aws_codeconnections_connection.github.arn
      }
    ]
  })
}
resource "aws_codepipeline" "candidate" {
  count          = local.candidate_count
  name           = local.candidate_name
  role_arn       = aws_iam_role.candidate_pipeline[0].arn
  pipeline_type  = "V2"
  execution_mode = "QUEUED"
  artifact_store {
    location = aws_s3_bucket.artifacts[0].id
    type     = "S3"
  }
  stage {
    name = "Source"
    action {
      name             = "GitHub"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["SourceRef"]
      namespace        = "SourceVars"
      configuration = {
        ConnectionArn        = aws_codeconnections_connection.github.arn
        FullRepositoryId     = "konglingtong44/kongPortfolio"
        BranchName           = var.candidate_source_branch
        OutputArtifactFormat = "CODEBUILD_CLONE_REF"
        DetectChanges        = "false"
      }
    }
  }
  stage {
    name = "BuildCandidate"
    action {
      name             = "VerifyAndPackage"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["SourceRef"]
      output_artifacts = ["Candidate"]
      configuration = {
        ProjectName = aws_codebuild_project.candidate[0].name
      }
    }
  }
  depends_on = [aws_iam_role_policy.candidate_pipeline, aws_s3_bucket_policy.artifacts, aws_s3_bucket_public_access_block.artifacts, aws_s3_bucket_versioning.artifacts, aws_s3_bucket_server_side_encryption_configuration.artifacts, aws_s3_bucket_ownership_controls.artifacts]
}

output "candidate_pipeline_name" {
  value = var.enable_candidate_pipeline ? aws_codepipeline.candidate[0].name : null
}
