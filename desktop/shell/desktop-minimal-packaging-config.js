import path from 'node:path';
import {
  resolveBuildResourcesDir,
  resolveLocalElectronDist,
  resolvePublishDir,
  resolveShellDir,
} from './desktop-packaging-paths.js';

export function createDesktopMinimalPackagingConfig() {
  const shellDir = resolveShellDir();
  const publishDir = resolvePublishDir();
  const buildResourcesDir = resolveBuildResourcesDir();
  const electronDist = resolveLocalElectronDist(shellDir);

  return {
    appId: 'com.gamefy.desktop.minimal',
    productName: 'GamefyMinimal',
    directories: {
      output: path.resolve(shellDir, 'dist-minimal'),
      buildResources: buildResourcesDir,
    },
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
    },
    asar: false,
    win: {
      target: ['dir'],
      artifactName: 'GamefyMinimal--win-dir.',
    },
    ...(electronDist ? { electronDist } : {}),
  };
}
