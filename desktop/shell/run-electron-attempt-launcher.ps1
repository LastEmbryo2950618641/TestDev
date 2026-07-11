param(
  [int]$WaitSeconds = 6
)

$ErrorActionPreference = 'Stop'
$ShellDir = 'C:\Users\liuqi\Documents\TestDev\desktop\shell'
$ElectronExe = Join-Path $ShellDir 'node_modules\electron\dist\electron.exe'
$ArtifactsDir = Join-Path $ShellDir '.artifacts'
$BootstrapLog = Join-Path $ArtifactsDir 'electron-bootstrap-entry.log'
$MainLog = Join-Path $ArtifactsDir 'electron-main-entry.log'
$AttemptArtifact = Join-Path $ArtifactsDir 'attempt-launch-result.json'
$LauncherLog = Join-Path $ArtifactsDir 'electron-launcher-run.log'

New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null
'' | Set-Content -LiteralPath $LauncherLog -Encoding UTF8
Add-Content -LiteralPath $LauncherLog -Value ((Get-Date).ToString('o') + ' launcher-start')

foreach ($path in @($BootstrapLog, $MainLog, $AttemptArtifact)) {
  if (Test-Path $path) {
    Remove-Item -LiteralPath $path -Force
    Add-Content -LiteralPath $LauncherLog -Value ((Get-Date).ToString('o') + ' removed=' + $path)
  }
}

Get-CimInstance Win32_Process |
  Where-Object { $_.Name -match 'electron' -or $_.CommandLine -match 'codex-electron-launch|TestDev\\desktop\\shell' } |
  ForEach-Object {
    try {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
      Add-Content -LiteralPath $LauncherLog -Value ((Get-Date).ToString('o') + ' stopped=' + $_.ProcessId)
    } catch {
      Add-Content -LiteralPath $LauncherLog -Value ((Get-Date).ToString('o') + ' stop-failed=' + $_.ProcessId + ' ' + $_.Exception.Message)
    }
  }

Start-Sleep -Seconds 1

Start-Process -FilePath $ElectronExe -ArgumentList $ShellDir,'--','--codex-electron-launch' -WorkingDirectory $ShellDir -WindowStyle Hidden
Add-Content -LiteralPath $LauncherLog -Value ((Get-Date).ToString('o') + ' electron-started')

Start-Sleep -Seconds $WaitSeconds

$result = [pscustomobject]@{
  shellDir = $ShellDir
  electronExe = $ElectronExe
  bootstrapLogPresent = (Test-Path $BootstrapLog)
  mainLogPresent = (Test-Path $MainLog)
  attemptArtifactPresent = (Test-Path $AttemptArtifact)
  bootstrapLog = if (Test-Path $BootstrapLog) { Get-Content -LiteralPath $BootstrapLog -Raw } else { '' }
  mainLog = if (Test-Path $MainLog) { Get-Content -LiteralPath $MainLog -Raw } else { '' }
  attemptArtifact = if (Test-Path $AttemptArtifact) { Get-Content -LiteralPath $AttemptArtifact -Raw } else { '' }
}

$result | ConvertTo-Json -Depth 6
