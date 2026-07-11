import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDesktopPackagingToolRecommendation } from './desktop-packaging-tool-recommendation.js';
import { createDesktopPackagingConfig } from './desktop-packaging-config.js';

function resolveShellDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function packageExists(shellDir, name) {
  return fs.existsSync(path.resolve(shellDir, 'node_modules', name, 'package.json'));
}

export function createDesktopPackagingDryRunPlan() {
  const shellDir = resolveShellDir();
  const recommendation = createDesktopPackagingToolRecommendation();
  const config = createDesktopPackagingConfig();
  const hasBuilder = packageExists(shellDir, 'electron-builder');
  const hasForge = packageExists(shellDir, '@electron-forge/cli');

  const selectedTool = recommendation.recommended;
  const dryRunAvailable = (selectedTool === 'electron-builder' && hasBuilder) || (selectedTool === 'electron-forge' && hasForge);

  return {
    runtimeFamily: 'desktop-packaging-dry-run-plan',
    stage: 'desktop-packaging-dry-run-plan',
    shellLocalOnly: true,
    selectedTool,
    configMain: config?.extraMetadata?.main || '',
    dryRunAvailable,
    commands: selectedTool === 'electron-builder'
      ? ['npx electron-builder --dir --config generated-or-bound-config']
      : ['npx electron-forge make --platform win32'],
    checks: {
      dryRunAvailable,
      configReady: typeof config?.extraMetadata?.main === 'string' && config.extraMetadata.main.length > 0,
      publishBundleReady: Array.isArray(config?.files) && config.files.some((item) => typeof item === 'object' && item?.to === 'publish'),
    },
    nextActions: dryRunAvailable
      ? ['run-dry-run-now']
      : ['install-selected-tool', 'bind-config-to-tool', 'run-dry-run-now'],
  };
}
