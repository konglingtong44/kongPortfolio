function Resolve-PortfolioCodex {
    foreach ($name in @('codex.exe', 'codex.cmd', 'codex')) {
        $command = Get-Command $name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($command) { return $command.Source }
    }

    # The official VS Code extension bundles a CLI, but ordinary terminals do
    # not inherit the extension's bin directory as the agent's shell does.
    $profileDirectory = [Environment]::GetFolderPath('UserProfile')
    $extensionsDirectory = Join-Path $profileDirectory '.vscode/extensions'
    $platforms = @('windows-x86_64', 'windows-aarch64')
    if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { $platforms = @('windows-aarch64', 'windows-x86_64') }
    $candidates = @(Get-ChildItem -LiteralPath $extensionsDirectory -Directory -Filter 'openai.chatgpt-*' -ErrorAction SilentlyContinue |
        ForEach-Object {
            $manifestPath = Join-Path $_.FullName 'package.json'
            if (Test-Path -LiteralPath $manifestPath) {
                try {
                    $manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath $manifestPath | ConvertFrom-Json
                    if ($manifest.publisher -eq 'openai' -and $manifest.name -eq 'chatgpt') {
                        [pscustomobject]@{ Directory = $_.FullName; Version = [version]($manifest.version -replace '-.*$', '') }
                    }
                } catch { Write-Verbose "Skipping unreadable extension manifest: $manifestPath" }
            }
        } | Sort-Object Version -Descending)
    foreach ($candidate in $candidates) {
        foreach ($platform in $platforms) {
            $executable = Join-Path $candidate.Directory "bin/$platform/codex.exe"
            if (Test-Path -LiteralPath $executable -PathType Leaf) { return $executable }
        }
    }
    throw 'Codex CLI not found on PATH or in the official VS Code extension. Install the official Codex CLI, reopen PowerShell, then run scripts/ai/codex.ps1 -Action Version.'
}
