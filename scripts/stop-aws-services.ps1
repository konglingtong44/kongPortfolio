param([string]$Profile = 'kong-dev', [string]$AwsCli = 'aws')
& "$PSScriptRoot/cost-control.ps1" -Action off -Profile $Profile -AwsCli $AwsCli
