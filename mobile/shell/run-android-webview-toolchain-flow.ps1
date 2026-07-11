param(
  [string]$SdkDir = '',
  [switch]$MaterializeLocalProperties,
  [switch]$RunTasks
)

$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$overviewScript = Join-Path $root 'mobile\shell\android-webview-toolchain-overview-report.js'
$materializeScript = Join-Path $root 'mobile\shell\materialize-android-local-properties.ps1'
$buildAttemptScript = Join-Path $root 'mobile\shell\run-android-webview-build-attempt.ps1'

Write-Output 'step=overview'
node $overviewScript

if ($MaterializeLocalProperties) {
  Write-Output 'step=materialize-local-properties'
  if ([string]::IsNullOrWhiteSpace($SdkDir)) {
    powershell -ExecutionPolicy Bypass -File $materializeScript
  } else {
    powershell -ExecutionPolicy Bypass -File $materializeScript -SdkDir $SdkDir
  }
}

Write-Output 'step=build-attempt'
if ($RunTasks) {
  powershell -ExecutionPolicy Bypass -File $buildAttemptScript -RunTasks
} else {
  powershell -ExecutionPolicy Bypass -File $buildAttemptScript
}
