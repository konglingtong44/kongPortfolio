$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'codex.ps1'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$before = @(Get-ChildItem (Join-Path $repo '.local/aidlc') -Filter '*-codex-diagnostics.json' -ErrorAction SilentlyContinue).Count
& $script -Action Report | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Report did not save successfully.' }
$reports = @(Get-ChildItem (Join-Path $repo '.local/aidlc') -Filter '*-codex-diagnostics.json' | Sort-Object LastWriteTimeUtc -Descending)
if ($reports.Count -le $before) { throw 'Report did not create a new JSON file.' }
$json = Get-Content -Raw -LiteralPath $reports[0].FullName | ConvertFrom-Json
$markdown = [IO.Path]::ChangeExtension($reports[0].FullName, '.md')
if (-not $json.reportWritten -or -not (Test-Path -LiteralPath $markdown)) { throw 'Report pair is incomplete.' }
if (-not $json.versions.PowerShell -or -not $json.doctor -or $json.unverified.Count -lt 4) { throw 'Report fields are incomplete.' }
$ErrorActionPreference = 'Continue'
& powershell.exe -NoProfile -File $script -Action Report -Probe 2>$null | Out-Null
$ErrorActionPreference = 'Stop'
if ($LASTEXITCODE -eq 0) { throw 'Report -Probe should fail.' }
Write-Output 'Codex report checks passed.'

# Keep fixtures and the temporary PATH change inside this process and .local.
$savedPath = $env:Path
$fixture = Join-Path $repo '.local/aidlc/test-bin'
New-Item -ItemType Directory -Force -Path $fixture | Out-Null
if (Test-Path (Join-Path $fixture 'aidlc.cmd')) { Remove-Item -LiteralPath (Join-Path $fixture 'aidlc.cmd') -Force }
try {
    $env:Path = "$fixture;$env:SystemRoot\System32;$env:SystemRoot"
    & $script -Action Report | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Missing-tool report should save.' }
    $latest = @(Get-ChildItem (Join-Path $repo '.local/aidlc') -Filter '*-codex-diagnostics.json' | Sort-Object LastWriteTimeUtc -Descending)[0]
    $result = Get-Content -Raw $latest.FullName | ConvertFrom-Json
    if ($result.versions.'AI-DLC'.status -ne 'unavailable' -or $result.doctor.status -ne 'unavailable') { throw 'Missing AI-DLC was not recorded.' }

    $fake = Join-Path $fixture 'aidlc.cmd'
    [IO.File]::WriteAllText($fake, "@echo off`r`nif `"%1`"==`"--version`" echo aidlc 0.0.0 (runtime 0.0.0)`r`nif `"%1`"==`"doctor`" echo invalid-json`r`n", [Text.Encoding]::ASCII)
    & $script -Action Report | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Invalid doctor report should save.' }
    $latest = @(Get-ChildItem (Join-Path $repo '.local/aidlc') -Filter '*-codex-diagnostics.json' | Sort-Object LastWriteTimeUtc -Descending)[0]
    $result = Get-Content -Raw $latest.FullName | ConvertFrom-Json
    if ($result.versions.'AI-DLC'.status -ne 'version-mismatch' -or $result.doctor.status -ne 'invalid-json') { throw 'Version mismatch or invalid doctor JSON was not recorded.' }
} finally {
    $env:Path = $savedPath
}
Write-Output 'Codex report failure checks passed.'

$isolated = Join-Path $repo '.local/aidlc/write-failure-fixture'
New-Item -ItemType Directory -Force -Path (Join-Path $isolated 'scripts/ai') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $isolated '.local') | Out-Null
Copy-Item -LiteralPath $script -Destination (Join-Path $isolated 'scripts/ai/codex.ps1') -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'tools.ps1') -Destination (Join-Path $isolated 'scripts/ai/tools.ps1') -Force
Copy-Item -LiteralPath (Join-Path $repo 'scripts/tools.ps1') -Destination (Join-Path $isolated 'scripts/tools.ps1') -Force
[IO.File]::WriteAllText((Join-Path $isolated '.local/aidlc'), 'occupied', [Text.Encoding]::ASCII)
$ErrorActionPreference = 'Continue'
& powershell.exe -NoProfile -File (Join-Path $isolated 'scripts/ai/codex.ps1') -Action Report 2>$null | Out-Null
$ErrorActionPreference = 'Stop'
if ($LASTEXITCODE -eq 0) { throw 'Unwritable report location should fail.' }
Write-Output 'Codex report write-failure check passed.'
