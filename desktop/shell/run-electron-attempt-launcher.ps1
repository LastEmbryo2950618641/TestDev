param(
  [int]$WaitSeconds = 6
)

$ErrorActionPreference = 'Stop'
$ShellDir = 'C:\Users\liuqi\Documents\TestDev\desktop\shell'
$LocalElectronExe = Join-Path $ShellDir '.electron-dist\electron-v36.9.5-win32-x64\electron.exe'
$NodeModulesElectronExe = Join-Path $ShellDir 'node_modules\electron\dist\electron.exe'
$ElectronExe = if (Test-Path $LocalElectronExe) { $LocalElectronExe } else { $NodeModulesElectronExe }
$ArtifactsDir = Join-Path $ShellDir '.artifacts'
$BootstrapLog = Join-Path $ArtifactsDir 'electron-bootstrap-entry.log'
$MainLog = Join-Path $ArtifactsDir 'electron-main-entry.log'
$AttemptArtifact = Join-Path $ArtifactsDir 'attempt-launch-result.json'
$LauncherLog = Join-Path $ArtifactsDir 'electron-launcher-run.log'

function Read-TextOrEmpty($Path) {
  if (Test-Path $Path) {
    return [string](Get-Content -LiteralPath $Path -Raw)
  }
  return ''
}

function Read-TailOrEmpty($Path, $Count = 40) {
  if (Test-Path $Path) {
    return [string]::Join("`n", (Get-Content -LiteralPath $Path -Tail $Count))
  }
  return ''
}

New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null
'' | Set-Content -LiteralPath $LauncherLog -Encoding UTF8
Add-Content -LiteralPath $LauncherLog -Value ((Get-Date).ToString('o') + ' launcher-start')

foreach ($path in @($BootstrapLog, $AttemptArtifact)) {
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
  bootstrapLogTail = Read-TailOrEmpty $BootstrapLog 20
  mainLogTail = Read-TailOrEmpty $MainLog 20
  attemptArtifact = Read-TextOrEmpty $AttemptArtifact
}

$result | ConvertTo-Json -Depth 6
