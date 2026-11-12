# Offline plan tests: no certificate requests, DNS writes or domain purchases.
mock_provider "aws" {
  mock_data "aws_route53_zone" {
    defaults = {
      name         = "example.com."
      private_zone = false
    }
  }
  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}"
    }
  }
}

run "default_domain_leaves_website_unchanged" {
  command = plan
  variables { custom_domain = null }
  assert {
    condition     = length(aws_acm_certificate.site) == 0 && length(aws_route53_record.website) == 0
    error_message = "The existing CloudFront-only deployment must not request a certificate or change DNS."
  }
  assert {
    condition     = length(aws_cloudfront_distribution.site.aliases) == 0 && aws_cloudfront_distribution.site.viewer_certificate[0].cloudfront_default_certificate
    error_message = "Default HTTPS must remain usable before domain registration completes."
  }
}

run "custom_domain_uses_free_certificate_and_preserves_other_records" {
  command = plan
  override_data {
    target = data.aws_route53_zone.domain[0]
    values = { name = "example.com.", private_zone = false }
  }
  variables {
    custom_domain = { name = "example.com", hosted_zone_id = "ZEXAMPLE" }
  }
  assert {
    condition     = aws_acm_certificate.site[0].region == "us-east-1" && aws_acm_certificate.site[0].options[0].export == "DISABLED"
    error_message = "CloudFront requires a us-east-1 non-exportable ACM certificate."
  }
  assert {
    condition     = toset(keys(aws_route53_record.website)) == toset(["A", "AAAA"]) && !aws_route53_record.website["A"].allow_overwrite && !aws_route53_record.certificate_validation[0].allow_overwrite
    error_message = "Only A/AAAA and the verification record may be added; existing records must not be overwritten."
  }
  assert {
    condition     = toset(aws_cloudfront_distribution.site.aliases) == toset(["example.com"]) && aws_cloudfront_distribution.site.viewer_certificate[0].minimum_protocol_version == "TLSv1.2_2021" && aws_cloudfront_distribution.site.viewer_certificate[0].ssl_support_method == "sni-only"
    error_message = "The approved domain must use SNI and TLS 1.2+."
  }
}

run "reject_unrelated_hosted_zone" {
  command = plan
  override_data {
    target = data.aws_route53_zone.domain[0]
    values = { name = "example.com.", private_zone = false }
  }
  variables {
    custom_domain = { name = "unrelated.net", hosted_zone_id = "ZEXAMPLE" }
  }
  expect_failures = [aws_acm_certificate.site[0]]
}
