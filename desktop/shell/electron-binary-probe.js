import fs from 'node:fs';
import path from 'node:path';
import { desktopShellElectronTarget } from './electron-target-config.js';
import { resolveLocalElectronDist } from './desktop-packaging-paths.js';

function resolveCacheRoot() {
  return `${process.env.LOCALAPPDATA}\\electron\\Cache`;
}

export function createElectronBinaryProbe() {
  const targetZipPath = `${resolveCacheRoot()}\\${desktopShellElectronTarget.fileName}`;
  const localDist = resolveLocalElectronDist();
  const installedBinary = localDist ? path.resolve(localDist, 'electron.exe') : '';
  return {
    runtimeFamily: 'desktop-electron-binary-probe',
    stage: 'desktop-electron-binary-probe',
    shellLocalOnly: true,
    electronDirPresent: fs.existsSync(new URL('./node_modules/electron', import.meta.url)),
    distDirPresent: fs.existsSync(new URL('./node_modules/electron/dist', import.meta.url)),
    pathFilePresent: fs.existsSync(new URL('./node_modules/electron/path.txt', import.meta.url)),
    localDist,
    localDistPresent: Boolean(localDist),
    installedBinary,
    electronExePresent: Boolean(installedBinary && fs.existsSync(installedBinary)),
    cachedZips: fs.existsSync(resolveCacheRoot()) ? fs.readdirSync(resolveCacheRoot()).filter((name) => name.endsWith('.zip')).map((name) => `${resolveCacheRoot()}\\${name}`) : [],
    targetZipPath,
    checks: {
      installedBinaryReady: Boolean(installedBinary && fs.existsSync(installedBinary)),
      cachedZipAvailable: fs.existsSync(targetZipPath),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  process.stdout.write(`${JSON.stringify(createElectronBinaryProbe(), null, 2)}\n`);
}
