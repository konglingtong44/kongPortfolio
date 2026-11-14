param(
    [Parameter(Mandatory)][ValidatePattern('^[0-9]{12}$')][string]$ExpectedAccountId,
    [string]$Profile = 'kong-dev',
    [string]$AwsExecutable = 'aws'
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$modelId = 'qwen.qwen3-235b-a22b-2507-v1:0'
function Read-AwsJson([string[]]$Arguments) {
    $raw = & $AwsExecutable @Arguments --profile $Profile --region ap-northeast-1 --output json --no-cli-pager --cli-connect-timeout 10 --cli-read-timeout 20
    if ($LASTEXITCODE -ne 0) { throw 'AWS read failed; no inference or configuration changes were attempted.' }
    return ($raw | ConvertFrom-Json)
}
$identity = Read-AwsJson -Arguments @('sts', 'get-caller-identity')
if ($identity.Account -ne $ExpectedAccountId) { throw 'AWS account mismatch.' }
$details = (Read-AwsJson -Arguments @('bedrock', 'get-foundation-model', '--model-identifier', $modelId)).modelDetails
if ($details.modelId -ne $modelId -or $details.modelLifecycle.status -ne 'ACTIVE' -or 'ON_DEMAND' -notin $details.inferenceTypesSupported) {
    throw 'The selected model is not active with on-demand inference in Tokyo. Review the model choice; do not silently switch regions.'
}
$availability = Read-AwsJson -Arguments @('bedrock', 'get-foundation-model-availability', '--model-id', $modelId)
$availability | ConvertTo-Json -Depth 6
# Availability can return the unversioned ID; GetFoundationModel above verifies the exact version.
if ($availability.modelId -notin @($modelId, ($modelId -replace ':0$', '')) -or $availability.regionAvailability -ne 'AVAILABLE' -or $availability.authorizationStatus -ne 'AUTHORIZED' -or $availability.entitlementAvailability -ne 'AVAILABLE' -or $availability.agreementAvailability.status -ne 'AVAILABLE') {
    throw 'Model availability is not ready. This check will not activate a model or accept an agreement.'
}
$quotas = @(
    (Read-AwsJson -Arguments @('service-quotas', 'get-service-quota', '--service-code', 'bedrock', '--quota-code', 'L-3875BCCF')).Quota,
    (Read-AwsJson -Arguments @('service-quotas', 'get-service-quota', '--service-code', 'bedrock', '--quota-code', 'L-548A1A32')).Quota
)
foreach ($quota in $quotas) {
    if ($quota.ServiceCode -ne 'bedrock' -or ($quota.QuotaName -replace '[^a-zA-Z0-9]', '').ToLowerInvariant() -notlike '*qwen3235ba22b2507v1*') {
        throw 'The quota does not belong to the selected Qwen model.'
    }
}
$quotas | Select-Object QuotaName, Value, Adjustable | Format-Table -AutoSize
if (@($quotas | Where-Object { $_.Value -le 0 }).Count -gt 0) {
    throw 'The selected Tokyo Qwen model has zero applied account quota. Default quota values are not account allocations; no inference was attempted.'
}
Write-Output 'Tokyo Qwen metadata/access and positive applied-account quota checks passed for the CLI identity. Lambda role permissions and real inference are NOT verified.'
