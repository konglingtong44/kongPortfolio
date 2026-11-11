$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/tools.ps1"
$repo = (Resolve-Path "$PSScriptRoot/..").Path
Push-Location $repo
try {
    $npm = Require-Tool 'npm.cmd'
    $maven = Require-Tool 'mvn.cmd'
    $gitleaks = Require-Tool 'gitleaks'
    Push-Location "$repo/frontend"
    try {
        & $npm ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
        & $npm run build
        if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
        & $npm test
        if ($LASTEXITCODE -ne 0) { throw 'Frontend tests failed.' }
    } finally { Pop-Location }
    & $maven -B -ntp -f "$repo/backend/pom.xml" verify
    if ($LASTEXITCODE -ne 0) { throw 'Backend verification failed.' }
    & $gitleaks dir --redact --no-banner .
    if ($LASTEXITCODE -ne 0) { throw 'Secret scan failed.' }
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        docker compose config --quiet
        if ($LASTEXITCODE -ne 0) { throw 'Compose configuration failed.' }
    }
    Write-Host 'Local checks passed. This does not verify a Docker image build.'
} finally { Pop-Location }
