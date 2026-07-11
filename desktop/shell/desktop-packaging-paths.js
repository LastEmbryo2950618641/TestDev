import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function resolveShellDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

export function resolveProjectRoot() {
  return path.resolve(resolveShellDir(), '..', '..');
}

export function resolvePublishDir() {
  return path.resolve(resolveProjectRoot(), 'publish');
}

export function resolveBuildResourcesDir() {
  return path.resolve(resolveProjectRoot(), 'assets');
}

export function resolveLocalElectronDist(shellDir = resolveShellDir()) {
  const electronDistDir = path.resolve(shellDir, 'node_modules', 'electron', 'dist');
  const electronBinary = path.resolve(electronDistDir, 'electron.exe');

  if (!fs.existsSync(electronBinary)) {
    return null;
  }

  return electronDistDir;
}
