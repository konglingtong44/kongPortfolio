# Reuses an already registered/delegated domain and existing zone. Does not buy a
# domain, change registrar nameservers, or create a hosted zone.
param(
    [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9.-]+$')][string]$DomainName,
    [Parameter(Mandatory = $true)][ValidatePattern('^Z[A-Z0-9]+$')][string]$HostedZoneId,
    [Parameter(Mandatory = $true)][ValidatePattern('^[0-9]{12}$')][string]$ExpectedAccountId,
    [string]$Profile = 'kong-dev',
    [string]$AwsExecutable = 'aws',
    [string]$TerraformExecutable = 'terraform',
    [switch]$Apply
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/tools.ps1"
$awsTool = Require-Tool $AwsExecutable
$terraformTool = Require-Tool $TerraformExecutable
$repo = (Resolve-Path "$PSScriptRoot/..").Path
$previousProfile = $env:AWS_PROFILE
$env:AWS_PROFILE = $Profile
try {
    $account = & $awsTool sts get-caller-identity --profile $Profile --region us-east-1 --query Account --output text --no-cli-pager
    if ($LASTEXITCODE -ne 0 -or $account.Trim() -ne $ExpectedAccountId) { throw 'AWS account mismatch.' }
    $zoneRaw = & $awsTool route53 get-hosted-zone --id $HostedZoneId --profile $Profile --output json --no-cli-pager
    if ($LASTEXITCODE -ne 0) { throw 'Could not read the selected hosted zone.' }
    $zone = ($zoneRaw -join "`n") | ConvertFrom-Json
    $zoneName = $zone.HostedZone.Name.TrimEnd('.')
    if ($zone.HostedZone.Config.PrivateZone -or ($DomainName -ne $zoneName -and -not $DomainName.EndsWith('.' + $zoneName))) { throw 'Name does not belong to the selected public hosted zone.' }
    $expectedNs = @($zone.DelegationSet.NameServers | ForEach-Object { $_.TrimEnd('.').ToLowerInvariant() } | Sort-Object)
    $publicDns = Invoke-RestMethod -Uri ('https://dns.google/resolve?name=' + [Uri]::EscapeDataString($zoneName) + '&type=NS')
    $actualNs = @($publicDns.Answer | Where-Object type -eq 2 | ForEach-Object { $_.data.TrimEnd('.').ToLowerInvariant() } | Sort-Object)
    if ($publicDns.Status -ne 0 -or ($expectedNs -join ',') -ne ($actualNs -join ',')) { throw 'Public delegation does not match the selected zone; no Terraform configuration was enabled or applied.' }
    $configPath = Join-Path $repo 'infra/terraform/portfolio/custom-domain.auto.tfvars.json'
    @{custom_domain=@{name=$DomainName;hosted_zone_id=$HostedZoneId}} | ConvertTo-Json -Depth 4 | Set-Content -Encoding ascii -LiteralPath $configPath
    $chdir = '-chdir=' + (Join-Path $repo 'infra/terraform/portfolio')
    $ErrorActionPreference = 'Continue'
    & $terraformTool $chdir plan -input=false -no-color '-out=custom-domain.tfplan'
    $planExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($planExit -ne 0) { throw 'Custom domain plan failed; no apply was run.' }
    $planRaw = & $terraformTool $chdir show -json custom-domain.tfplan
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect custom domain plan.' }
    $plan = ($planRaw -join "`n") | ConvertFrom-Json
    $allowed = @('aws_acm_certificate.site[0]', 'aws_acm_certificate_validation.site[0]', 'aws_route53_record.certificate_validation[0]', 'aws_route53_record.website["A"]', 'aws_route53_record.website["AAAA"]', 'aws_cloudfront_distribution.site', 'aws_s3_bucket_policy.site')
    $changes = @($plan.resource_changes | Where-Object { $_.mode -eq 'managed' -and ($_.change.actions -join ',') -ne 'no-op' })
    foreach ($change in $changes) {
        if ($change.address -notin $allowed -or $change.change.actions -contains 'delete') { throw "Unexpected domain-plan mutation: $($change.address)" }
    }
    Write-Host "Domain plan reviewed: $($changes.Count) in-scope changes; no delete, zone purchase or application deployment."
    if ($Apply) {
        $ErrorActionPreference = 'Continue'
        & $terraformTool $chdir apply -input=false -no-color custom-domain.tfplan
        $applyExit = $LASTEXITCODE
        $ErrorActionPreference = 'Stop'
        if ($applyExit -ne 0) { throw 'Domain apply failed; preserve State and inspect before retrying.' }
    } else { Write-Host 'Plan only. Use -Apply after reviewing it.' }
} finally { $env:AWS_PROFILE = $previousProfile }
