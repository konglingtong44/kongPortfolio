param(
    [ValidateSet('status', 'initialize', 'off', 'on')][string]$Action = 'status',
    [string]$Profile = 'kong-dev',
    [string]$ExpectedAccountId = '561798268037',
    [decimal]$BaselineUsd = 0,
    [string]$AwsCli = 'aws'
)
$ErrorActionPreference = 'Stop'
$identityRaw = & $AwsCli sts get-caller-identity --profile $Profile --output json
if ($LASTEXITCODE -ne 0) { throw 'SSO unavailable; run aws sso login first.' }
$identity = $identityRaw | ConvertFrom-Json
if ($identity.Account -ne $ExpectedAccountId) { throw 'Wrong AWS account; no action performed.' }
if ($BaselineUsd -lt 0) { throw 'Baseline must be nonnegative.' }
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('portfolio-cost-' + [guid]::NewGuid())
[IO.Directory]::CreateDirectory($tempRoot) | Out-Null
try {
    $requestPath = Join-Path $tempRoot 'request.json'
    $responsePath = Join-Path $tempRoot 'response.json'
    $payload = @{ action = $Action; baseline_usd = $BaselineUsd.ToString([Globalization.CultureInfo]::InvariantCulture) } | ConvertTo-Json -Compress
    [IO.File]::WriteAllText($requestPath, $payload, (New-Object Text.UTF8Encoding($false)))
    $metaRaw = & $AwsCli lambda invoke --profile $Profile --region ap-northeast-1 --function-name kongportfolio-cost-control --invocation-type RequestResponse --cli-read-timeout 360 --payload "fileb://$requestPath" $responsePath --output json
    if ($LASTEXITCODE -ne 0) { throw 'Invocation failed. Do not assume services changed.' }
    $meta = $metaRaw | ConvertFrom-Json
    $response = [IO.File]::ReadAllText($responsePath)
    Write-Output $response
    if ($meta.FunctionError) { throw 'Controller reported failure; inspect status/logs and retry the same action after resolving it.' }
} finally {
    # Only remove the known temporary files created by this invocation.
    foreach ($file in @($requestPath, $responsePath)) {
        if ($file -and (Test-Path -LiteralPath $file)) { Remove-Item -LiteralPath $file }
    }
    [IO.Directory]::Delete($tempRoot)
}
