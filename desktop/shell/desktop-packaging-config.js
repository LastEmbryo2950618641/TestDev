import path from 'node:path';
import {
  resolveBuildResourcesDir,
  resolveLocalElectronDist,
  resolvePublishDir,
  resolveShellDir,
} from './desktop-packaging-paths.js';

export function createDesktopPackagingConfig() {
  const shellDir = resolveShellDir();
  const publishDir = resolvePublishDir();
  const buildResourcesDir = resolveBuildResourcesDir();
  const electronDist = resolveLocalElectronDist(shellDir);

  return {
    appId: 'com.gamefy.desktop',
    productName: 'Gamefy',
    directories: {
      output: path.resolve(shellDir, 'dist'),
      buildResources: buildResourcesDir,
    },
    files: [
      'electron-main-bootstrap.cjs',
      'electron-main.js',
      'electron-preload.js',
      'package.json',
      'bridge/**/*',
      'node_modules/**/*',
      {
        from: publishDir,
        to: 'publish',
        filter: ['**/*'],
      },
    ],
    extraMetadata: {
      main: 'electron-main-bootstrap.cjs',
    },
    asar: false,
    win: {
      target: ['portable'],
      artifactName: 'Gamefy-${version}-win-portable.${ext}',
    },
    ...(electronDist ? { electronDist } : {}),
  };
}
