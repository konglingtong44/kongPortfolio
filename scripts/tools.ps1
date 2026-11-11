# Load current user-level tool paths even in terminals opened before installation.
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath) { $env:Path = $userPath + ';' + $env:Path }
if (-not $env:JAVA_HOME) { $env:JAVA_HOME = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User') }

function Require-Tool([string]$Name) {
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $command) { throw "Missing tool: $Name. See README.md for prerequisites." }
    return $command.Source
}
