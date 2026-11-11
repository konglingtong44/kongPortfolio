terraform {
  required_version = ">= 1.10, < 2.0"
  backend "s3" {}
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region              = "ap-northeast-1"
  allowed_account_ids = [var.expected_account_id]
  default_tags {
    tags = {
      Project     = "kongPortfolio"
      Environment = "prod"
      ManagedBy   = "Terraform"
    }
  }
}

variable "expected_account_id" {
  type = string
  validation {
    condition     = can(regex("^[0-9]{12}$", var.expected_account_id))
    error_message = "Provide the intended 12-digit account ID."
  }
}

variable "release_directory" {
  type        = string
  description = "Absolute directory created by prepare-first-release.ps1; never edit it after planning."
}

variable "custom_domain" {
  description = "Optional registered domain and existing public hosted zone. Leave null until registration/delegation is verified."
  type = object({
    name           = string
    hosted_zone_id = string
  })
  default = null
  validation {
    condition     = var.custom_domain == null ? true : can(regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$", var.custom_domain.name)) && can(regex("^Z[A-Z0-9]+$", var.custom_domain.hosted_zone_id))
    error_message = "Use a lower-case DNS name (no wildcard, scheme or trailing dot) and a valid existing hosted zone ID."
  }
}

locals {
  name     = "kongportfolio-prod"
  release  = jsondecode(file("${var.release_directory}/manifest.json"))
  zip_path = "${var.release_directory}/backend.zip"
}

output "website_url" {
  value = var.custom_domain == null ? "https://${aws_cloudfront_distribution.site.domain_name}" : "https://${var.custom_domain.name}"
}
output "cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.site.domain_name}"
}
output "site_bucket_name" {
  value = aws_s3_bucket.site.id
}
output "initial_release_id" {
  value = local.release.releaseId
}
output "function_name" {
  value = aws_lambda_function.api.function_name
}
output "api_endpoint" {
  value = aws_apigatewayv2_api.api.api_endpoint
}
output "candidate_provenance" {
  value = {
    base_git_commit = local.release.gitCommit
    source_dirty    = local.release.sourceDirty
    snapshot_sha256 = local.release.releaseId
  }
}
output "candidate_manifest_sha256" {
  value = filesha256("${var.release_directory}/manifest.json")
}
