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
      Project   = "kongPortfolio"
      Purpose   = "cicd"
      ManagedBy = "Terraform"
    }
  }
}

variable "expected_account_id" {
  type = string
  validation {
    condition     = can(regex("^[0-9]{12}$", var.expected_account_id))
    error_message = "Provide the intended 12-digit AWS account ID."
  }
}

# OAuth installation is completed by the repository owner in the AWS console.
# No PAT, GitHub credential or installation token belongs in Terraform inputs.
resource "aws_codeconnections_connection" "github" {
  name          = "kongportfolio-github"
  provider_type = "GitHub"
  lifecycle {
    prevent_destroy = true
  }
}

output "connection_arn" {
  value = aws_codeconnections_connection.github.arn
}

output "connection_status" {
  value = aws_codeconnections_connection.github.connection_status
}

output "connections_console_url" {
  value = "https://ap-northeast-1.console.aws.amazon.com/codesuite/settings/connections?region=ap-northeast-1"
}
