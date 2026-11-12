# Registering/buying a domain is deliberately outside this stack. The name must
# already be registered and publicly delegated to this existing hosted zone.
data "aws_route53_zone" "domain" {
  count        = var.custom_domain == null ? 0 : 1
  zone_id      = var.custom_domain.hosted_zone_id
  private_zone = false
}

resource "aws_acm_certificate" "site" {
  count             = var.custom_domain == null ? 0 : 1
  region            = "us-east-1"
  domain_name       = var.custom_domain.name
  validation_method = "DNS"
  key_algorithm     = "RSA_2048"
  options {
    export                                      = "DISABLED"
    certificate_transparency_logging_preference = "ENABLED"
  }
  lifecycle {
    create_before_destroy = true
    precondition {
      condition     = !data.aws_route53_zone.domain[0].private_zone && (trimsuffix(data.aws_route53_zone.domain[0].name, ".") == var.custom_domain.name || endswith(var.custom_domain.name, ".${trimsuffix(data.aws_route53_zone.domain[0].name, ".")}"))
      error_message = "The domain must belong to the selected existing public hosted zone."
    }
  }
}

resource "aws_route53_record" "certificate_validation" {
  count           = var.custom_domain == null ? 0 : 1
  zone_id         = var.custom_domain.hosted_zone_id
  name            = one(aws_acm_certificate.site[0].domain_validation_options).resource_record_name
  type            = one(aws_acm_certificate.site[0].domain_validation_options).resource_record_type
  records         = [one(aws_acm_certificate.site[0].domain_validation_options).resource_record_value]
  ttl             = 300
  allow_overwrite = false
}

resource "aws_acm_certificate_validation" "site" {
  count                   = var.custom_domain == null ? 0 : 1
  region                  = "us-east-1"
  certificate_arn         = aws_acm_certificate.site[0].arn
  validation_record_fqdns = [aws_route53_record.certificate_validation[0].fqdn]
  timeouts { create = "20m" }
}

resource "aws_route53_record" "website" {
  for_each        = var.custom_domain == null ? toset([]) : toset(["A", "AAAA"])
  zone_id         = var.custom_domain.hosted_zone_id
  name            = var.custom_domain.name
  type            = each.value
  allow_overwrite = false
  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
