import fs from 'node:fs';
import path from 'node:path';

export function resolveDesktopRuntimePaths(shellDir, fileExists = fs.existsSync) {
  const packagedPublishDir = path.resolve(shellDir, 'publish');
  const sourceWorkspaceRoot = path.resolve(shellDir, '..', '..');
  const sourcePublishDir = path.resolve(sourceWorkspaceRoot, 'publish');
  const publishDir = fileExists(path.resolve(packagedPublishDir, 'index.html'))
    ? packagedPublishDir
    : sourcePublishDir;

  return {
    shellDir,
    workspaceRoot: publishDir === packagedPublishDir ? shellDir : sourceWorkspaceRoot,
    preloadPath: path.resolve(shellDir, 'electron-preload.js'),
    rendererEntry: path.resolve(publishDir, 'index.html'),
  };
}
