[CmdletBinding()]
param(
    [ValidateSet('Preview', 'Configure', 'Doctor', 'Launch', 'Version', 'Report')]
    [string]$Action = 'Preview',
    [switch]$Probe
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/../tools.ps1"
. "$PSScriptRoot/tools.ps1"
$repo = (Resolve-Path "$PSScriptRoot/../..").Path
$reportMode = $Action -eq 'Report'
if ($reportMode -and $Probe) { throw 'Report cannot be combined with -Probe because probe setup writes files.' }
$target = $repo
if ($reportMode) {
    $directory = Join-Path $repo '.local/aidlc'
    try { New-Item -ItemType Directory -Force -Path $directory | Out-Null }
    catch { Write-Error "Cannot create report directory: $($_.Exception.Message)"; exit 1 }
    $stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
    $jsonPath = Join-Path $directory "$stamp-codex-diagnostics.json"
    $markdownPath = Join-Path $directory "$stamp-codex-diagnostics.md"
    $report = [ordered]@{
        generatedAt = [DateTime]::UtcNow.ToString('o')
        reportWritten = $false
        diagnosticsPassed = $false
        expectedAidlcVersion = 'aidlc 2.11.4 (runtime 2.11.4)'
        versions = [ordered]@{}
        doctor = [ordered]@{ command = 'aidlc doctor --json --offline'; status = 'not-run'; exitCode = $null; result = $null; error = $null }
        unverified = @('Live model tasks', 'Complete approvals and hook events', 'Context compaction recovery', 'AWS and production verification')
    }
    try { $codexPath = Resolve-PortfolioCodex } catch { $codexPath = $null }
    $tools = @(
        @{name='PowerShell'; path=$null; args=@()},
        @{name='AI-DLC'; path=(Get-Command aidlc -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source); args=@('--version')},
        @{name='Codex CLI'; path=$codexPath; args=@('--version')}
    )
    $report.versions['PowerShell'] = @{status='available'; output=$PSVersionTable.PSVersion.ToString()}
    foreach ($tool in $tools | Where-Object { $_.name -ne 'PowerShell' }) {
        if (-not $tool.path) { $report.versions[$tool.name] = @{status='unavailable'; output=$null}; continue }
        try {
            $out = (& $tool.path @($tool.args) 2>&1 | Out-String).Trim(); $code = $LASTEXITCODE
            $report.versions[$tool.name] = @{status=if($code -eq 0){'available'}else{'failed'}; output=$out; exitCode=$code}
        } catch { $report.versions[$tool.name] = @{status='failed'; output=$null; error=$_.Exception.Message.Substring(0,[Math]::Min(500,$_.Exception.Message.Length))} }
    }
    if ($report.versions['AI-DLC'].status -eq 'available' -and $report.versions['AI-DLC'].output -ne $report.expectedAidlcVersion) {
        $report.versions['AI-DLC'].status = 'version-mismatch'
    }
    $aidlcPath = (Get-Command aidlc -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source)
    if ($aidlcPath) {
        try {
            $doctorText = (& $aidlcPath doctor --json --offline 2>&1 | Out-String).Trim(); $doctorCode = $LASTEXITCODE
            $report.doctor.exitCode = $doctorCode
            try { $report.doctor.result = $doctorText | ConvertFrom-Json -ErrorAction Stop; $report.doctor.status = if($doctorCode -eq 0){'completed'}else{'failed'} }
            catch { $report.doctor.status = 'invalid-json'; $report.doctor.error = $doctorText.Substring(0,[Math]::Min(2000,$doctorText.Length)) }
        } catch { $report.doctor.status='failed'; $report.doctor.error=$_.Exception.Message.Substring(0,[Math]::Min(500,$_.Exception.Message.Length)) }
    } else { $report.doctor.status='unavailable'; $report.doctor.error='AI-DLC CLI unavailable' }
    $report.diagnosticsPassed = ($report.doctor.status -eq 'completed' -and $report.versions['AI-DLC'].status -eq 'available' -and $report.versions['Codex CLI'].status -eq 'available')
    $md = @('# Local diagnostics report', '', "Generated at (UTC): $($report.generatedAt)", "Diagnostics passed: $($report.diagnosticsPassed)", '', '## Versions', '')
    foreach ($name in $report.versions.Keys) { $v=$report.versions[$name]; $md += "- ${name}: $($v.status); exit=$($v.exitCode); output=$($v.output); error=$($v.error)" }
    $md += @('', '## Doctor', '', "Command: $($report.doctor.command)", "Status: $($report.doctor.status)", "Exit code: $($report.doctor.exitCode)", "Error: $($report.doctor.error)", '```json', ($report.doctor.result | ConvertTo-Json -Depth 20), '```', '', '## Unverified', '')
    foreach ($item in $report.unverified) { $md += "- $item" }
    try {
        $report.reportWritten = $true
        $json = $report | ConvertTo-Json -Depth 30
        [IO.File]::WriteAllText($jsonPath,$json,[Text.UTF8Encoding]::new($false))
        [IO.File]::WriteAllText($markdownPath,($md -join "`n"),[Text.UTF8Encoding]::new($false))
        Write-Output "Report saved: $jsonPath; $markdownPath"
        exit 0
    } catch { Write-Error "Cannot write complete reports: $($_.Exception.Message)"; exit 1 }
}
$aidlc = Require-Tool 'aidlc.exe'
$target = $repo
if ($Probe) {
    $target = Join-Path $repo '.local/aidlc/probe'
    # The probe is a separate Git repository under the ignored local directory.
    if (-not (Test-Path -LiteralPath (Join-Path $target '.git'))) {
        New-Item -ItemType Directory -Force -Path $target | Out-Null
        & git init --quiet $target
        if ($LASTEXITCODE -ne 0) { throw 'Cannot initialize the AI-DLC probe.' }
        foreach ($name in @('AGENTS.md', '.gitignore')) {
            Copy-Item -LiteralPath (Join-Path $repo $name) -Destination (Join-Path $target $name)
        }
    }
    foreach ($name in @('portfolio-story', 'portfolio-release-review')) {
        $destination = Join-Path $target ".agents/skills/$name"
        if (-not (Test-Path -LiteralPath $destination)) {
            New-Item -ItemType Directory -Force -Path (Split-Path $destination) | Out-Null
            Copy-Item -LiteralPath (Join-Path $repo ".agents/skills/$name") -Destination $destination -Recurse
        }
    }
}

$nativeExit = 0
Push-Location $target
try {
    $versionText = (& $aidlc --version | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $versionText -notmatch '^aidlc 2\.11\.4 \(runtime 2\.11\.4\)$') {
        throw "Expected AI-DLC 2.11.4; found: $versionText. See docs/ai/aidlc-codex.md."
    }
    switch ($Action) {
        'Preview' {
            & $aidlc config --harness codex --dry-run --yes
            $nativeExit = $LASTEXITCODE
        }
        'Configure' {
            & $aidlc config --harness codex --yes
            $nativeExit = $LASTEXITCODE
            if ($nativeExit -eq 0) {
                & $aidlc config --pin 2.11.4 --yes
                $nativeExit = $LASTEXITCODE
            }
        }
        'Doctor' {
            $codex = Resolve-PortfolioCodex
            $env:Path = (Split-Path $codex) + ';' + $env:Path
            & $aidlc doctor --json --offline
            $nativeExit = $LASTEXITCODE
        }
        'Version' {
            $codex = Resolve-PortfolioCodex
            Write-Output "Codex CLI: $codex"
            & $codex --version
            $nativeExit = $LASTEXITCODE
        }
        'Launch' {
            if (-not (Test-Path -LiteralPath '.codex/config.toml') -or
                -not (Test-Path -LiteralPath '.agents/skills/aidlc/SKILL.md')) {
                throw 'This target is not configured. Preview and review the generated configuration first.'
            }
            $codex = Resolve-PortfolioCodex
            $env:Path = (Split-Path $codex) + ';' + $env:Path
            # Extension bundles may lack the background-server package.
            & $codex --no-daemon
            $nativeExit = $LASTEXITCODE
        }
    }
} finally {
    Pop-Location
}
exit $nativeExit
