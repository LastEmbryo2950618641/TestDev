import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import extract from 'extract-zip';
import { desktopShellElectronTarget } from './electron-target-config.js';

function resolveShellDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function resolveCacheRoot() {
  return path.resolve(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'electron', 'Cache');
}

function resolveArtifactState() {
  const shellDir = resolveShellDir();
  const electronDir = path.resolve(shellDir, 'node_modules', 'electron');
  return {
    electronDir,
    distDir: path.resolve(electronDir, 'dist'),
    pathFile: path.resolve(electronDir, 'path.txt'),
    binaryRelativePath: 'electron.exe',
    cachedZipPath: path.resolve(resolveCacheRoot(), desktopShellElectronTarget.fileName),
  };
}

async function ensureDir(targetDir) {
  await fsp.mkdir(targetDir, { recursive: true });
}

async function resetDir(targetDir) {
  await fsp.rm(targetDir, { recursive: true, force: true });
  await ensureDir(targetDir);
}

export async function acquireElectronBinaryFromCache() {
  const state = resolveArtifactState();
  const result = {
    runtimeFamily: 'desktop-electron-binary-acquisition',
    stage: 'desktop-electron-binary-acquisition-from-cache',
    shellLocalOnly: true,
    cachedZipPath: state.cachedZipPath,
    binaryPath: path.resolve(state.distDir, state.binaryRelativePath),
    extracted: false,
    ready: false,
    notes: [],
  };

  try {
    if (!fs.existsSync(state.cachedZipPath)) {
      result.notes.push('cached-zip-missing');
      return result;
    }

    await ensureDir(state.electronDir);
    await resetDir(state.distDir);
    await extract(state.cachedZipPath, { dir: state.distDir });
    await fsp.writeFile(state.pathFile, state.binaryRelativePath, 'utf8');

    result.extracted = true;
    result.ready = fs.existsSync(result.binaryPath);
    if (!result.ready) {
      result.notes.push('binary-missing-after-cache-extract');
    }
  } catch (error) {
    result.notes.push(String(error?.message || error));
  }

  return result;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  process.stdout.write(`${JSON.stringify(await acquireElectronBinaryFromCache(), null, 2)}\n`);
}
