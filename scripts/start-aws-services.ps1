param([string]$Profile = 'kong-dev', [string]$AwsCli = 'aws', [decimal]$BaselineUsd = 0)
& "$PSScriptRoot/cost-control.ps1" -Action on -Profile $Profile -AwsCli $AwsCli -BaselineUsd $BaselineUsd
