$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/tools.ps1"
$repo = (Resolve-Path "$PSScriptRoot/..").Path
$mavenTool = Require-Tool 'mvn.cmd'
Push-Location $repo
try {
    # Windows PowerShell can promote redirected native stderr notices to errors.
    # The native exit code, rather than a JVM startup notice, decides success.
    $ErrorActionPreference = 'Continue'
    & $mavenTool -B -ntp -f backend/pom.xml -Plambda clean verify
    $mavenExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($mavenExit -ne 0) { throw 'Lambda verification/build failed.' }
    & node scripts/test-lambda-package.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Lambda package smoke failed.' }
    & node scripts/prepare-first-release.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Frontend release preparation failed.' }
} finally { Pop-Location }
