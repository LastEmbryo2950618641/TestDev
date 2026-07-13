import path from 'node:path';
import {
  resolveBuildResourcesDir,
  resolveLocalElectronDist,
  resolvePublishDir,
  resolveShellDir,
} from './desktop-packaging-paths.js';
import { DESKTOP_RUNTIME_FILES } from './desktop-runtime-files.js';

const DESKTOP_ELECTRON_VERSION = '36.9.5';

export function createDesktopPackagingConfig() {
  const shellDir = resolveShellDir();
  const publishDir = resolvePublishDir();
  const buildResourcesDir = resolveBuildResourcesDir();
  const electronDist = resolveLocalElectronDist(shellDir);

  return {
    appId: 'com.gamefy.desktop',
    productName: 'Gamefy',
    directories: {
      app: shellDir,
      output: path.resolve(shellDir, 'dist'),
      buildResources: buildResourcesDir,
    },
    npmRebuild: false,
    nodeGypRebuild: false,
    buildDependenciesFromSource: false,
    files: [
      ...DESKTOP_RUNTIME_FILES,
      'package.json',
      {
        from: publishDir,
        to: 'publish',
        filter: ['**/*'],
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
      target: ['portable'],
      artifactName: 'Gamefy-${version}-win-portable.${ext}',
    },
    ...(electronDist ? { electronDist } : {}),
  };
}
