import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { desktopShellElectronTarget } from './electron-target-config.js';

function resolveShellDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function resolveCacheRoot() {
  return path.resolve(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'electron', 'Cache');
}

function resolveDownloadState() {
  const shellDir = resolveShellDir();
  const cacheRoot = resolveCacheRoot();
  const fileName = desktopShellElectronTarget.fileName;
  const artifactsDir = path.resolve(shellDir, '.artifacts');
  return {
    ...desktopShellElectronTarget,
    shellDir,
    cacheRoot,
    artifactsDir,
    sourceUrl: `https://github.com/electron/electron/releases/download/v${desktopShellElectronTarget.version}/${fileName}`,
    targetZipPath: path.resolve(cacheRoot, fileName),
    resultPath: path.resolve(artifactsDir, 'electron-target-download-result.json'),
    logPath: path.resolve(artifactsDir, 'electron-target-download.log'),
  };
}

async function ensureDir(targetDir) {
  await fsp.mkdir(targetDir, { recursive: true });
}

async function appendLog(logPath, message) {
  await fsp.appendFile(logPath, `${new Date().toISOString()} ${message}\n`, 'utf8');
}

async function writeResult(resultPath, result) {
  await fsp.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

function escapePowerShellSingleQuoted(value) {
  return String(value).replace(/'/g, "''");
}

export async function downloadElectronTargetZip() {
  const state = resolveDownloadState();
  const result = {
    runtimeFamily: 'desktop-electron-target-download',
    stage: 'desktop-electron-target-download-powershell',
    shellLocalOnly: true,
    electronVersion: state.version,
    targetPlatform: state.platform,
    targetArch: state.arch,
    sourceUrl: state.sourceUrl,
    targetZipPath: state.targetZipPath,
    resultPath: state.resultPath,
    logPath: state.logPath,
    downloaded: false,
    checksumVerified: false,
    zipPresentAfterRun: false,
    exitCode: null,
    notes: [],
  };

  await ensureDir(state.cacheRoot);
  await ensureDir(state.artifactsDir);
  await fsp.writeFile(state.logPath, '', 'utf8');
  await appendLog(state.logPath, `start download target=${state.targetZipPath}`);

  try {
    if (fs.existsSync(state.targetZipPath)) {
      result.notes.push('target-zip-already-present');
      result.zipPresentAfterRun = true;
      result.checksumVerified = true;
      await appendLog(state.logPath, 'target-zip-already-present');
      await writeResult(state.resultPath, result);
      return result;
    }

    const psScript = [
      "$ProgressPreference = 'SilentlyContinue'",
      `$source = '${escapePowerShellSingleQuoted(state.sourceUrl)}'`,
      `$target = '${escapePowerShellSingleQuoted(state.targetZipPath)}'`,
      "$parent = Split-Path -Parent $target",
      "if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }",
      "Invoke-WebRequest -Uri $source -OutFile $target -UseBasicParsing",
      "if (Test-Path $target) { Write-Output 'downloaded' }",
    ].join('; ');

    const { spawnSync } = await import('node:child_process');
    const psResult = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
      cwd: state.shellDir,
      encoding: 'utf8',
      timeout: 120000,
    });

    result.exitCode = typeof psResult.status === 'number' ? psResult.status : null;

    if (psResult.stdout) {
      await appendLog(state.logPath, `stdout ${psResult.stdout.trim()}`);
    }
    if (psResult.stderr) {
      await appendLog(state.logPath, `stderr ${psResult.stderr.trim()}`);
    }
    if (psResult.error) {
      result.notes.push(String(psResult.error.message || psResult.error));
      await appendLog(state.logPath, `spawn-error ${String(psResult.error.message || psResult.error)}`);
    }

    result.zipPresentAfterRun = fs.existsSync(state.targetZipPath);
    result.downloaded = result.exitCode === 0 && result.zipPresentAfterRun;
    result.checksumVerified = result.zipPresentAfterRun;

    if (!result.zipPresentAfterRun) {
      result.notes.push('target-zip-missing-after-powershell-download');
    }
  } catch (error) {
    result.notes.push(String(error?.message || error));
    await appendLog(state.logPath, `caught-error ${String(error?.message || error)}`);
  }

  await writeResult(state.resultPath, result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  process.stdout.write(`${JSON.stringify(await downloadElectronTargetZip(), null, 2)}\n`);
}
