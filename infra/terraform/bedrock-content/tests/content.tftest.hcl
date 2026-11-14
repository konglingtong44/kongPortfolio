mock_provider "aws" {
  mock_resource "aws_s3_object" { defaults = { version_id = "reviewed-v1" } }
  mock_resource "aws_s3_bucket" {
    defaults = { id = "mock-private-bucket", arn = "arn:aws:s3:::mock-private-bucket" }
  }
}
variables { expected_account_id = "123456789012" }

run "private_storage_without_readers_by_default" {
  command = plan
  assert {
    condition = (length(aws_iam_role_policy.reader) == 0 && length(aws_s3_object.approved) == 0 &&
      aws_s3_bucket_public_access_block.content.block_public_acls &&
      aws_s3_bucket_public_access_block.content.block_public_policy &&
      aws_s3_bucket_public_access_block.content.ignore_public_acls &&
      aws_s3_bucket_public_access_block.content.restrict_public_buckets)
    error_message = "The bucket must remain private and grants require an explicit approved source."
  }
}
run "reject_readers_without_source" {
  command = plan
  variables { reader_role_names = ["kongportfolio-stg-lambda"] }
  expect_failures = [var.reader_role_names]
}
run "reader_cannot_write_or_read_another_version" {
  command = apply
  variables {
    approved_text_path = "tests/fixtures/approved.txt"
    reader_role_names  = ["kongportfolio-stg-lambda"]
  }
  assert {
    condition = jsondecode(aws_iam_role_policy.reader["kongportfolio-stg-lambda"].policy) == {
      Version = "2012-10-17"
      Statement = [{
        Effect = "Allow", Action = ["s3:GetObjectVersion"]
        Resource  = "${aws_s3_bucket.content.arn}/approved/facts.txt"
        Condition = { StringEquals = { "s3:VersionId" = ["reviewed-v1"] } }
      }]
    }
    error_message = "Only the exact approved object version may be read; no list or write permission."
  }
}
run "reject_other_roles" {
  command = plan
  variables {
    approved_text_path = "tests/fixtures/approved.txt"
    reader_role_names  = ["kongportfolio-ci-backend"]
  }
  expect_failures = [var.reader_role_names]
}
