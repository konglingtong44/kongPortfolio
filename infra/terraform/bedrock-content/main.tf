terraform {
  required_version = ">= 1.10, < 2.0"
  backend "s3" {}
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
}

provider "aws" {
  region              = "ap-northeast-1"
  allowed_account_ids = [var.expected_account_id]
  default_tags {
    tags = { Project = "kongPortfolio", Purpose = "approved-bedrock-content", ManagedBy = "Terraform" }
  }
}

variable "expected_account_id" {
  type = string
  validation {
    condition     = can(regex("^[0-9]{12}$", var.expected_account_id))
    error_message = "Provide the reviewed account ID."
  }
}

variable "approved_text_path" {
  type        = string
  default     = null
  nullable    = true
  description = "Local UTF-8 text approved for visitor answers; do not commit private source files."
  validation {
    condition = var.approved_text_path == null ? true : try(
      length(trimspace(file(var.approved_text_path))) > 0 &&
      length(file(var.approved_text_path)) <= 20000 &&
    length(filebase64(var.approved_text_path)) <= 109224, false)
    error_message = "Approved source must exist, be nonempty UTF-8, at most 20,000 codepoints and 80 KiB."
  }
}

variable "reader_role_names" {
  type        = set(string)
  default     = []
  description = "Existing business roles to grant exact-version read access, independently of model enablement."
  validation {
    condition = length(setsubtract(var.reader_role_names, ["kongportfolio-stg-lambda", "kongportfolio-prod-lambda"])) == 0 && (
      length(var.reader_role_names) == 0 || var.approved_text_path != null
    )
    error_message = "Only reviewed STG/PROD roles may read; an approved source is required."
  }
}

variable "rollback_version_ids" {
  type        = set(string)
  default     = []
  description = "Previously approved versions still needed by live/Green or rollback; remove only after their retirement."
  validation {
    condition     = alltrue([for id in var.rollback_version_ids : length(trimspace(id)) > 0 && id != "null"])
    error_message = "Rollback references must be real immutable version IDs."
  }
}

locals {
  bucket = "kongportfolio-content-${var.expected_account_id}-ap-northeast-1"
  key    = "approved/facts.txt"
}

resource "aws_s3_bucket" "content" {
  bucket        = local.bucket
  force_destroy = false
  lifecycle { prevent_destroy = true }
}
resource "aws_s3_bucket_public_access_block" "content" {
  bucket                  = aws_s3_bucket.content.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_ownership_controls" "content" {
  bucket = aws_s3_bucket.content.id
  rule { object_ownership = "BucketOwnerEnforced" }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "content" {
  bucket = aws_s3_bucket.content.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
resource "aws_s3_bucket_versioning" "content" {
  bucket = aws_s3_bucket.content.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_policy" "content" {
  bucket = aws_s3_bucket.content.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect    = "Deny", Principal = "*", Action = "s3:*",
    Resource  = [aws_s3_bucket.content.arn, "${aws_s3_bucket.content.arn}/*"],
    Condition = { Bool = { "aws:SecureTransport" = "false" } }
  }] })
}
resource "aws_s3_bucket_lifecycle_configuration" "content" {
  bucket = aws_s3_bucket.content.id
  rule {
    id     = "expire-old-approved-versions"
    status = "Enabled"
    filter { prefix = "approved/" }
    noncurrent_version_expiration { noncurrent_days = 90 }
  }
  depends_on = [aws_s3_bucket_versioning.content]
}
resource "aws_s3_object" "approved" {
  count                  = var.approved_text_path == null ? 0 : 1
  bucket                 = aws_s3_bucket.content.id
  key                    = local.key
  source                 = var.approved_text_path
  source_hash            = filesha256(var.approved_text_path)
  content_type           = "text/plain; charset=utf-8"
  server_side_encryption = "AES256"
  depends_on = [aws_s3_bucket_versioning.content, aws_s3_bucket_public_access_block.content,
    aws_s3_bucket_ownership_controls.content, aws_s3_bucket_server_side_encryption_configuration.content,
  aws_s3_bucket_policy.content]
  lifecycle { prevent_destroy = true }
}
resource "aws_iam_role_policy" "reader" {
  for_each = var.reader_role_names
  name     = "approved-facts-version-read-only"
  role     = each.value
  policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect    = "Allow", Action = ["s3:GetObjectVersion"],
    Resource  = "${aws_s3_bucket.content.arn}/${local.key}",
    Condition = { StringEquals = { "s3:VersionId" = sort(tolist(setunion([aws_s3_object.approved[0].version_id], var.rollback_version_ids))) } }
  }] })
}

output "bucket" { value = aws_s3_bucket.content.id }
output "application_environment" {
  value = var.approved_text_path == null ? {} : {
    BEDROCK_FACTS_BUCKET  = aws_s3_bucket.content.id
    BEDROCK_FACTS_VERSION = aws_s3_object.approved[0].version_id
    BEDROCK_FACTS_SHA256  = filesha256(var.approved_text_path)
    BEDROCK_FACTS_OWNER   = var.expected_account_id
  }
}
