# Only run after the matching resource plan and candidate have been approved.
param(
    [Parameter(Mandatory = $true)][ValidatePattern('^[0-9]{12}$')][string]$ExpectedAccountId,
    [Parameter(Mandatory = $true)][string]$ReleaseDirectory,
    [string]$Profile = 'kong-dev',
    [string]$AwsExecutable = 'aws'
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/tools.ps1"
$awsTool = Require-Tool $AwsExecutable
$regionArguments = @('--profile', $Profile, '--region', 'ap-northeast-1', '--no-cli-pager')
$actualAccount = & $awsTool sts get-caller-identity @regionArguments --query Account --output text
if ($LASTEXITCODE -ne 0 -or $actualAccount.Trim() -ne $ExpectedAccountId) { throw 'AWS account mismatch or identity read failed.' }
$resolvedRelease = (Resolve-Path -LiteralPath $ReleaseDirectory).Path
$manifest = Get-Content -Raw -Encoding utf8 -LiteralPath (Join-Path $resolvedRelease 'manifest.json') | ConvertFrom-Json
if ($manifest.schemaVersion -ne 1 -or $manifest.kind -ne 'first-release-candidate' -or $manifest.releaseId -notmatch '^[0-9a-f]{64}$') { throw 'Invalid release manifest.' }
$bucket = "kongportfolio-site-$ExpectedAccountId-ap-northeast-1"
$frontendRoot = (Resolve-Path -LiteralPath (Join-Path $resolvedRelease 'frontend')).Path
$uploads = @()
# Verify every file before the first upload; only manifest-listed files can be published.
foreach ($file in $manifest.frontend) {
    $source = [IO.Path]::GetFullPath((Join-Path $frontendRoot $file.path))
    if (-not $source.StartsWith($frontendRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'File escaped release directory.' }
    $sha = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($sha -ne $file.sha256) { throw "Changed artifact: $($file.path)" }
    if ($file.path -notmatch '^[a-zA-Z0-9_./-]+$' -or $file.path -match '(^|/)\.\.(/|$)') { throw 'Unexpected object path.' }
    $uploads += @{Source=$source; File=$file; Checksum=[Convert]::ToBase64String(([byte[]]($sha -split '(..)' | Where-Object { $_ } | ForEach-Object { [Convert]::ToByte($_,16) })))}
}
foreach ($upload in $uploads) {
    $key = "releases/$($manifest.releaseId)/$($upload.File.path)"
    # Existing immutable keys must match exactly; never overwrite or delete releases.
    $savedPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $existingRaw = & $awsTool s3api head-object @regionArguments --bucket $bucket --key $key --checksum-mode ENABLED --output json 2>&1
    $headExit = $LASTEXITCODE
    $ErrorActionPreference = $savedPreference
    if ($headExit -eq 0) {
        $existing = ($existingRaw -join "`n") | ConvertFrom-Json
        if ($existing.ChecksumSHA256 -ne $upload.Checksum -or $existing.ContentType -ne $upload.File.contentType -or $existing.CacheControl -ne $upload.File.cacheControl) { throw "Existing immutable object differs: $key" }
        Write-Host "Already verified: $key"
        continue
    }
    if (($existingRaw -join "`n") -notmatch '\(404\)|Not Found|NoSuchKey') { throw "Could not verify object existence: $key" }
    & $awsTool s3api put-object @regionArguments --bucket $bucket --key $key --body $upload.Source --if-none-match '*' --server-side-encryption AES256 --checksum-algorithm SHA256 --checksum-sha256 $upload.Checksum --content-type $upload.File.contentType --cache-control $upload.File.cacheControl --output json | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Upload failed; no overwrite was attempted: $key" }
    Write-Host "Uploaded immutable object: $key"
}
Write-Host 'Frontend upload complete. No old objects were removed. Verify the CloudFront URL before calling deployment complete.'
