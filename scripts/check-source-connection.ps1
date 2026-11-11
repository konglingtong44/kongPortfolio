param(
    [Parameter(Mandatory)][ValidatePattern('^[0-9]{12}$')][string]$ExpectedAccountId,
    [Parameter(Mandatory)][ValidatePattern('^arn:aws:codeconnections:ap-northeast-1:[0-9]{12}:connection/[a-f0-9-]+$')][string]$ConnectionArn,
    [string]$Profile = 'kong-dev',
    [string]$AwsExecutable = 'aws'
)
$ErrorActionPreference = 'Stop'
if (($ConnectionArn -split ':')[4] -ne $ExpectedAccountId) {
    throw 'Connection ARN does not belong to the expected account.'
}
$identity = & $AwsExecutable sts get-caller-identity --profile $Profile --output json
if ($LASTEXITCODE -ne 0) { throw 'Could not verify the AWS identity.' }
if (($identity | ConvertFrom-Json).Account -ne $ExpectedAccountId) { throw 'AWS account mismatch.' }
$raw = & $AwsExecutable codeconnections get-connection --connection-arn $ConnectionArn --region ap-northeast-1 --profile $Profile --output json
if ($LASTEXITCODE -ne 0) { throw 'Could not read the connection.' }
$connection = ($raw | ConvertFrom-Json).Connection
if ($connection.OwnerAccountId -ne $ExpectedAccountId -or $connection.ConnectionArn -ne $ConnectionArn -or $connection.ProviderType -ne 'GitHub' -or $connection.ConnectionName -ne 'kongportfolio-github') {
    throw 'Unexpected source connection; no changes made.'
}
Write-Output "Connection: $($connection.ConnectionName); status: $($connection.ConnectionStatus)"
if ($connection.ConnectionStatus -ne 'AVAILABLE') {
    throw 'Complete the GitHub authorization in the Tokyo AWS Connections console, then run this check again.'
}
Write-Output 'Source connection is AVAILABLE. Repository clone/build is not yet verified.'
