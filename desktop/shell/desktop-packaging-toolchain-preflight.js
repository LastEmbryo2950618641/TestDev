import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDesktopPackagingConfig } from './desktop-packaging-config.js';

function resolveShellDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function packageExists(shellDir, name) {
  return fs.existsSync(path.resolve(shellDir, 'node_modules', name, 'package.json'));
}

export function createDesktopPackagingToolchainPreflight() {
  const shellDir = resolveShellDir();
  const config = createDesktopPackagingConfig();
  const hasElectronBuilder = packageExists(shellDir, 'electron-builder');
  const hasElectronForge = packageExists(shellDir, '@electron-forge/cli');

  const preferredTool = hasElectronBuilder ? 'electron-builder' : hasElectronForge ? 'electron-forge' : 'electron-builder';
  const missing = [];
  if (!hasElectronBuilder && !hasElectronForge) missing.push('packaging-toolchain');
  if (!config?.extraMetadata?.main) missing.push('package-main-metadata');
  if (!Array.isArray(config?.win?.target) || !config.win.target.length) missing.push('windows-target');
  if (!Array.isArray(config?.files) || !config.files.length) missing.push('packaging-files');

  return {
    runtimeFamily: 'desktop-packaging-toolchain-preflight',
    stage: 'desktop-packaging-toolchain-preflight',
    shellLocalOnly: true,
    preferredTool,
    checks: {
      hasElectronBuilder,
      hasElectronForge,
      packageMainReady: typeof config?.extraMetadata?.main === 'string' && config.extraMetadata.main.length > 0,
      windowsTargetReady: Array.isArray(config?.win?.target) && config.win.target.includes('portable'),
      filesReady: Array.isArray(config?.files) && config.files.length > 0,
    },
    missing,
    nextActions: [
      !hasElectronBuilder && !hasElectronForge ? 'install-packaging-toolchain' : 'toolchain-present',
      'bind-packaging-config-to-selected-tool',
      'run-desktop-packaging-dry-run',
    ],
  };
}
