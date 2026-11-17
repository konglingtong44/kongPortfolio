$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/tools.ps1"
$repo = (Resolve-Path "$PSScriptRoot/..").Path
Push-Location $repo
try {
    & node "$repo/scripts/checks/test-staging-sampling-plan.mjs"
    if ($LASTEXITCODE -ne 0) { throw 'Sampling plan verification failed.' }
    & node "$repo/scripts/checks/test-review-staging.mjs"
    if ($LASTEXITCODE -ne 0) { throw 'Local STG review verification failed.' }
    & node "$repo/scripts/checks/test-docs.mjs"
    if ($LASTEXITCODE -ne 0) { throw 'Documentation checker verification failed.' }
    & node "$repo/scripts/checks/check-docs.mjs"
    if ($LASTEXITCODE -ne 0) { throw 'Documentation links failed.' }
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
    & node "$repo/scripts/package-frontend.mjs"
    if ($LASTEXITCODE -ne 0) { throw 'Static artifact verification failed.' }
    & $maven -B -ntp -f "$repo/backend/pom.xml" clean verify
    if ($LASTEXITCODE -ne 0) { throw 'Backend verification failed.' }
    & $maven -B -ntp -f "$repo/backend/pom.xml" -Plambda clean verify
    if ($LASTEXITCODE -ne 0) { throw 'Lambda adapter verification failed.' }
    & node "$repo/scripts/test-lambda-package.mjs"
    if ($LASTEXITCODE -ne 0) { throw 'Lambda ZIP smoke test failed.' }
    & $gitleaks dir --redact --no-banner .
    if ($LASTEXITCODE -ne 0) { throw 'Secret scan failed.' }
    & node "$repo/.githooks/check-staged-paths.mjs" --all
    if ($LASTEXITCODE -ne 0) { throw 'Private tracked path check failed.' }
    & node "$repo/scripts/test-hooks.mjs"
    if ($LASTEXITCODE -ne 0) { throw 'Hook verification failed.' }
    & node "$repo/scripts/test-cloudfront-routing.mjs"
    if ($LASTEXITCODE -ne 0) { throw 'CloudFront routing verification failed.' }
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        docker compose config --quiet
        if ($LASTEXITCODE -ne 0) { throw 'Compose configuration failed.' }
    }
    Write-Host 'Local checks passed. This does not verify a Docker image build.'
} finally { Pop-Location }
