param(
  [switch]$RunTasks
)

$projectRoot = Join-Path $PSScriptRoot '..\android-webview-shell'
$projectRoot = [System.IO.Path]::GetFullPath($projectRoot)
$wrapperBat = Join-Path $projectRoot 'gradlew.bat'
$localProperties = Join-Path $projectRoot 'local.properties'
$assetsEntry = Join-Path $projectRoot 'app\src\main\assets\publish\index.html'
$recordPath = Join-Path $projectRoot '.last-build-attempt.json'

$result = [ordered]@{
  runtimeFamily = 'android-webview-build-attempt-record'
  projectRoot = $projectRoot
  wrapperBat = $wrapperBat
  localPropertiesPresent = [System.IO.File]::Exists($localProperties)
  runtimeEntryPresent = [System.IO.File]::Exists($assetsEntry)
  runTasksRequested = [bool]$RunTasks
  status = ''
}

if (-not (Test-Path $wrapperBat)) {
  $result.status = 'missing-wrapper'
  $result | ConvertTo-Json -Depth 6 | Set-Content $recordPath
  $result | ConvertTo-Json -Depth 6
  exit 0
}

$wrapperText = Get-Content $wrapperBat -Raw
if ($wrapperText -match 'placeholder') {
  $result.status = 'placeholder-wrapper'
  $result | ConvertTo-Json -Depth 6 | Set-Content $recordPath
  $result | ConvertTo-Json -Depth 6
  exit 0
}

if (-not (Test-Path $localProperties)) {
  $result.status = 'missing-local-properties'
  $result | ConvertTo-Json -Depth 6 | Set-Content $recordPath
  $result | ConvertTo-Json -Depth 6
  exit 0
}

if (-not $RunTasks) {
  $result.status = 'ready-for-wrapper-command'
  $result.next = 'Run with -RunTasks to execute gradlew.bat tasks once toolchain is ready.'
  $result | ConvertTo-Json -Depth 6 | Set-Content $recordPath
  $result | ConvertTo-Json -Depth 6
  exit 0
}

Push-Location $projectRoot
try {
  $output = & $wrapperBat tasks 2>&1
  $outputText = ($output | Out-String)
  if ($outputText -match 'Timeout of 120000 reached waiting for exclusive access to file:' -or $outputText -match 'GradleWrapperMain' -or $outputText -match 'java.lang.RuntimeException') {
    $result.status = 'tasks-blocked-by-wrapper-download-lock'
    $result.error = $outputText
  } else {
    $result.status = 'tasks-executed'
    $result.output = $outputText
  }
} catch {
  $result.status = 'tasks-failed'
  $result.error = ($_ | Out-String)
} finally {
  Pop-Location
}

$result | ConvertTo-Json -Depth 6 | Set-Content $recordPath
$result | ConvertTo-Json -Depth 6
