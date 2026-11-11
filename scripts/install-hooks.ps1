$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/tools.ps1"
Push-Location "$PSScriptRoot/.."
try {
    $null = Require-Tool 'gitleaks'
    git config core.hooksPath .githooks
    if ($LASTEXITCODE -ne 0) { throw 'Failed to configure Git hooks.' }
    Write-Host 'Enabled fail-closed Gitleaks pre-commit and pre-push hooks.'
} finally { Pop-Location }
