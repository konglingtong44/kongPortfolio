param([string]$Profile = 'kong-dev', [string]$AwsCli = 'aws', [string]$ExpectedAccountId = '561798268037')
$ErrorActionPreference = 'Stop'
$identity = & $AwsCli sts get-caller-identity --profile $Profile --output json
if ($LASTEXITCODE -ne 0) { throw 'SSO login required.' }
if (($identity | ConvertFrom-Json).Account -ne $ExpectedAccountId) { throw 'Wrong account.' }
$utcNow = [DateTime]::UtcNow
$start = $utcNow.ToString('yyyy-MM-01')
$end = $utcNow.AddDays(1).ToString('yyyy-MM-dd')
# Cost Explorer API requests can incur a small API fee. No infrastructure mutations.
$raw = & $AwsCli ce get-cost-and-usage --profile $Profile --time-period "Start=$start,End=$end" --granularity MONTHLY --metrics UnblendedCost --group-by Type=DIMENSION,Key=SERVICE --output json
if ($LASTEXITCODE -ne 0) { throw 'Cost Explorer query failed.' }
$data = $raw | ConvertFrom-Json
$data.ResultsByTime.Groups | ForEach-Object {
    [pscustomobject]@{ Service = $_.Keys[0]; USD = [decimal]$_.Metrics.UnblendedCost.Amount }
} | Sort-Object USD -Descending | Format-Table -AutoSize
Write-Output 'Estimated month-to-date unblended costs; excludes unreported usage. Credits/refunds may differ from gross shutdown budgets.'
