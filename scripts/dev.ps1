$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/tools.ps1"
$repo = (Resolve-Path "$PSScriptRoot/..").Path
$backend = $null
$frontend = $null
Push-Location $repo
try {
    $node = Require-Tool 'node'
    $npm = Require-Tool 'npm.cmd'
    $java = Require-Tool 'java'
    $maven = Require-Tool 'mvn.cmd'
    foreach ($port in @(5173, 8080)) {
        if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
            throw "Port $port is already in use. Stop the existing server before running this script."
        }
    }
    if (-not (Test-Path "$repo/frontend/node_modules")) {
        Push-Location "$repo/frontend"
        try { & $npm ci; if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' } }
        finally { Pop-Location }
    }
    & $maven -B -ntp -f "$repo/backend/pom.xml" -DskipTests package
    if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }
    New-Item -ItemType Directory -Force "$repo/.local" | Out-Null
    # Run a copy so Windows does not lock the Maven build output during later checks.
    Copy-Item -LiteralPath "$repo/backend/target/kongPortfolio.jar" -Destination "$repo/.local/backend-run.jar" -Force
    $backend = Start-Process -FilePath $java -ArgumentList @("-Dportfolio.content-directory=`"$repo/backend/src/main/resources/content`"", '-jar', "`"$repo/.local/backend-run.jar`"") -WorkingDirectory "$repo/backend" -WindowStyle Hidden -PassThru -RedirectStandardOutput "$repo/.local/backend.log" -RedirectStandardError "$repo/.local/backend-error.log"
    $frontend = Start-Process -FilePath $node -ArgumentList @("`"$repo/frontend/node_modules/vite/bin/vite.js`"", '--host', '127.0.0.1') -WorkingDirectory "$repo/frontend" -WindowStyle Hidden -PassThru -RedirectStandardOutput "$repo/.local/frontend.log" -RedirectStandardError "$repo/.local/frontend-error.log"
    $deadline = (Get-Date).AddSeconds(60)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        if ($backend.HasExited -or $frontend.HasExited) { throw 'A server exited. Check .local/*.log.' }
        try {
            $health = Invoke-RestMethod 'http://127.0.0.1:5173/api/health' -TimeoutSec 2
            if ($health.status -eq 'UP') { $ready = $true; break }
        } catch { }
        Start-Sleep -Milliseconds 500
    }
    if (-not $ready) { throw 'Server readiness timed out. Check .local/*.log.' }
    Write-Host "`nOpen http://localhost:5173 — Ctrl+C stops both servers."
    Write-Host 'Logs: .local/frontend.log and .local/backend.log'
    while (-not $backend.HasExited -and -not $frontend.HasExited) { Start-Sleep -Milliseconds 500 }
    throw 'A server exited. Check .local/*.log.'
} finally {
    foreach ($process in @($frontend, $backend)) {
        if ($null -ne $process -and -not $process.HasExited) { Stop-Process -Id $process.Id -ErrorAction SilentlyContinue }
    }
    Pop-Location
}
