# Read-only AWS deployment inventory. Never creates or updates resources.
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9]{12}$')]
    [string]$ExpectedAccountId,
    [string]$Profile = 'kong-dev',
    [string]$Region = 'ap-northeast-1',
    [string]$AwsExecutable = 'aws'
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/tools.ps1"
$awsTool = Require-Tool $AwsExecutable
$repo = (Resolve-Path "$PSScriptRoot/..").Path

function Read-AwsJson([string[]]$CliArguments) {
    $regionArguments = @()
    if ($CliArguments -notcontains '--region') { $regionArguments = @('--region', $Region) }
    $raw = & $awsTool @CliArguments @regionArguments --profile $Profile --output json --no-cli-pager
    if ($LASTEXITCODE -ne 0) { throw "AWS read failed: $($CliArguments[0]) $($CliArguments[1]). Report was not updated." }
    return ($raw -join "`n" | ConvertFrom-Json)
}

$identity = Read-AwsJson -CliArguments @('sts', 'get-caller-identity')
if ($identity.Account -ne $ExpectedAccountId) { throw 'AWS account mismatch; stopped before inventory.' }

$localDirectory = Join-Path $repo '.local'
New-Item -ItemType Directory -Force -Path $localDirectory | Out-Null
$notificationQuery = Join-Path $localDirectory ('budget-query-' + [guid]::NewGuid().ToString('N') + '.json')
$budgetSummaries = @()
try {
    $budgetResponse = Read-AwsJson -CliArguments @('budgets', 'describe-budgets', '--account-id', $ExpectedAccountId)
    foreach ($budget in $budgetResponse.Budgets) {
        $notifications = Read-AwsJson -CliArguments @('budgets', 'describe-notifications-for-budget', '--account-id', $ExpectedAccountId, '--budget-name', $budget.BudgetName)
        $notificationSummaries = @()
        foreach ($notification in $notifications.Notifications) {
            $notification | ConvertTo-Json -Compress | Set-Content -Encoding ascii -LiteralPath $notificationQuery
            $subscribers = Read-AwsJson -CliArguments @('budgets', 'describe-subscribers-for-notification', '--account-id', $ExpectedAccountId, '--budget-name', $budget.BudgetName, '--notification', "file://$notificationQuery")
            # Do not print or persist subscriber email addresses or SNS ARNs.
            $notificationSummaries += [ordered]@{
                Type = $notification.NotificationType
                Operator = $notification.ComparisonOperator
                Threshold = $notification.Threshold
                ThresholdType = $notification.ThresholdType
                EmailSubscribers = @($subscribers.Subscribers | Where-Object SubscriptionType -eq 'EMAIL').Count
                SnsSubscribers = @($subscribers.Subscribers | Where-Object SubscriptionType -eq 'SNS').Count
            }
        }
        $budgetSummaries += [ordered]@{
            Name = $budget.BudgetName
            Limit = $budget.BudgetLimit
            TimeUnit = $budget.TimeUnit
            Type = $budget.BudgetType
            Filters = $budget.CostFilters
            CostTypes = $budget.CostTypes
            Health = $budget.HealthStatus.Status
            Notifications = $notificationSummaries
        }
    }
} finally {
    if (Test-Path -LiteralPath $notificationQuery) { Remove-Item -LiteralPath $notificationQuery }
}

$zones = Read-AwsJson -CliArguments @('route53', 'list-hosted-zones')
$certificates = @()
foreach ($certificateRegion in @('us-east-1', $Region) | Select-Object -Unique) {
    $response = Read-AwsJson -CliArguments @('acm', 'list-certificates', '--region', $certificateRegion, '--includes', 'keyTypes=RSA_1024,RSA_2048,RSA_3072,RSA_4096,EC_prime256v1,EC_secp384r1,EC_secp521r1')
    $certificates += [ordered]@{
        Region = $certificateRegion
        Certificates = @($response.CertificateSummaryList | Select-Object DomainName, Status)
    }
}
$clusters = Read-AwsJson -CliArguments @('ecs', 'list-clusters')
$repositories = Read-AwsJson -CliArguments @('ecr', 'describe-repositories')
$distributions = Read-AwsJson -CliArguments @('cloudfront', 'list-distributions')
$loadBalancers = Read-AwsJson -CliArguments @('elbv2', 'describe-load-balancers')

$report = [ordered]@{
    CheckedAtUtc = [DateTime]::UtcNow.ToString('o')
    AccountVerified = $true
    Region = $Region
    Budgets = $budgetSummaries
    HostedZones = @($zones.HostedZones | Select-Object Name, @{Name='Private'; Expression={$_.Config.PrivateZone}})
    Certificates = $certificates
    EcsClusterCount = @($clusters.clusterArns).Count
    EcrRepositoryCount = @($repositories.repositories).Count
    CloudFrontDistributionCount = [int]$distributions.DistributionList.Quantity
    LoadBalancerCount = @($loadBalancers.LoadBalancers).Count
}
$reportPath = Join-Path $localDirectory 'aws-preflight.json'
$report | ConvertTo-Json -Depth 15 | Set-Content -Encoding utf8 -LiteralPath $reportPath
Write-Host "Read-only preflight complete: $reportPath"
Write-Host "Budgets: $($budgetSummaries.Count); hosted zones: $(@($zones.HostedZones).Count). Subscriber addresses are omitted."
Write-Host 'This does not verify email delivery, domain delegation, actual website availability or resource absence outside the queried regions/services.'
