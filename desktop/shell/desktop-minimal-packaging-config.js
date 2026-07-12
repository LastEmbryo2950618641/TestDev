import path from 'node:path';
import {
  resolveBuildResourcesDir,
  resolveLocalElectronDist,
  resolvePublishDir,
  resolveShellDir,
} from './desktop-packaging-paths.js';

const DESKTOP_ELECTRON_VERSION = '36.9.5';

export function createDesktopMinimalPackagingConfig() {
  const shellDir = resolveShellDir();
  const publishDir = resolvePublishDir();
  const buildResourcesDir = resolveBuildResourcesDir();
  const electronDist = resolveLocalElectronDist(shellDir);

  return {
    appId: 'com.gamefy.desktop.minimal',
    productName: 'GamefyMinimal',
    directories: {
      app: shellDir,
      output: path.resolve(shellDir, 'dist-minimal'),
      buildResources: buildResourcesDir,
    },
    npmRebuild: false,
    nodeGypRebuild: false,
    buildDependenciesFromSource: false,
    files: [
      'electron-main-bootstrap.cjs',
      'electron-main.js',
      'electron-preload.js',
      'package.json',
      {
        from: publishDir,
        to: 'publish',
        filter: [
          'index.html',
          'boot-manifest.js',
          'boot/**',
          'platform/**',
          'assets/**',
        ],
      },
    ],
    extraMetadata: {
      main: 'electron-main-bootstrap.cjs',
      devDependencies: {
        electron: DESKTOP_ELECTRON_VERSION,
      },
    },
    electronVersion: DESKTOP_ELECTRON_VERSION,
    asar: false,
    win: {
      target: ['dir'],
      artifactName: 'GamefyMinimal--win-dir.',
    },
    ...(electronDist ? { electronDist } : {}),
  };
}
