# Creates paid AWS resources. Run only after explicit approval of this saved plan.
param(
    [string]$Profile = 'kong-dev',
    [string]$TerraformExecutable = 'terraform',
    [string]$AwsExecutable = 'aws'
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/tools.ps1"
$repo = (Resolve-Path "$PSScriptRoot/..").Path
$terraformTool = Require-Tool $TerraformExecutable
$awsTool = Require-Tool $AwsExecutable
$terraformDirectory = Join-Path $repo 'infra/terraform/portfolio'
$chdir = '-chdir=' + $terraformDirectory
$previousProfile = $env:AWS_PROFILE
$env:AWS_PROFILE = $Profile
try {
    $rawPlan = & $terraformTool $chdir show -json first.tfplan
    if ($LASTEXITCODE -ne 0) { throw 'Could not read saved first.tfplan.' }
    $plan = ($rawPlan -join "`n") | ConvertFrom-Json
    if ($plan.errored -or -not $plan.applyable) { throw 'Saved plan is not applyable.' }
    $expectedAccount = $plan.variables.expected_account_id.value
    $actualAccount = & $awsTool sts get-caller-identity --profile $Profile --region ap-northeast-1 --query Account --output text --no-cli-pager
    if ($LASTEXITCODE -ne 0 -or $actualAccount.Trim() -ne $expectedAccount) { throw 'AWS account mismatch.' }
    $localDirectory = Join-Path $repo '.local'
    New-Item -ItemType Directory -Force -Path $localDirectory | Out-Null
    $jsonPath = Join-Path $localDirectory 'first.tfplan.json'
    $rawPlan | Set-Content -Encoding utf8 -LiteralPath $jsonPath
    & node (Join-Path $PSScriptRoot 'review-first-plan.mjs') $jsonPath
    if ($LASTEXITCODE -ne 0) { throw 'First plan scope review failed.' }
    $releaseDirectory = $plan.variables.release_directory.value
    $manifestPath = Join-Path $releaseDirectory 'manifest.json'
    if ((Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $plan.planned_values.outputs.candidate_manifest_sha256.value) { throw 'Manifest changed since planning.' }
    $manifest = Get-Content -Raw -Encoding utf8 -LiteralPath $manifestPath | ConvertFrom-Json
    if ((Get-FileHash -LiteralPath (Join-Path $releaseDirectory 'backend.zip') -Algorithm SHA256).Hash.ToLowerInvariant() -ne $manifest.backend.sha256) { throw 'Lambda ZIP changed since planning.' }
    $frontendRoot = [IO.Path]::GetFullPath((Join-Path $releaseDirectory 'frontend'))
    foreach ($file in $manifest.frontend) {
        $source = [IO.Path]::GetFullPath((Join-Path $frontendRoot $file.path))
        if (-not $source.StartsWith($frontendRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Frontend path escaped candidate directory.' }
        if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256) { throw "Frontend changed since planning: $($file.path)" }
    }
    Write-Host "Applying reviewed first plan: account verified; release $($manifest.releaseId); 23 creates only."
    $ErrorActionPreference = 'Continue'
    & $terraformTool $chdir apply -input=false -no-color first.tfplan
    $applyExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($applyExit -ne 0) { throw 'Terraform apply failed. Keep State; inspect before retrying.' }
    Write-Host 'Resources created. Upload the reviewed frontend candidate and run the HTTPS smoke test next.'
} finally { $env:AWS_PROFILE = $previousProfile }
