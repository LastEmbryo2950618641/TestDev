param(
  [string]$SdkDir = ''
)

$projectRoot = Join-Path $PSScriptRoot '..\android-webview-shell'
$projectRoot = [System.IO.Path]::GetFullPath($projectRoot)
$generatedPath = Join-Path $projectRoot 'local.properties.generated'
$targetPath = Join-Path $projectRoot 'local.properties'

if ([string]::IsNullOrWhiteSpace($SdkDir)) {
  if (Test-Path $generatedPath) {
    $generated = Get-Content $generatedPath -Raw
    if ($generated -match 'sdk\.dir=(.+)') {
      $SdkDir = $Matches[1].Trim()
    }
  }
}

$result = [ordered]@{
  runtimeFamily = 'android-local-properties-materialize-record'
  projectRoot = $projectRoot
  targetPath = $targetPath
  requestedSdkDir = $SdkDir
  wroteFile = $false
  status = ''
}

if ([string]::IsNullOrWhiteSpace($SdkDir)) {
  $result.status = 'missing-sdk-dir'
  $result | ConvertTo-Json -Depth 6
  exit 0
}

"sdk.dir=$SdkDir" | Set-Content $targetPath
$result.wroteFile = $true
$result.status = 'local-properties-written'
$result | ConvertTo-Json -Depth 6
