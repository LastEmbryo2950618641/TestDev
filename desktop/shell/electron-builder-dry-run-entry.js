import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDesktopPackagingToolRecommendation } from './desktop-packaging-tool-recommendation.js';

function resolveShellDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

export function createElectronBuilderDryRunEntry() {
  const shellDir = resolveShellDir();
  const builderConfigPath = path.resolve(shellDir, 'electron-builder.config.js');
  const builderPackagePath = path.resolve(shellDir, 'node_modules', 'electron-builder', 'package.json');
  const hasBuilder = fs.existsSync(builderPackagePath);
  const recommendation = createDesktopPackagingToolRecommendation();

  return {
    runtimeFamily: 'desktop-electron-builder-dry-run-entry',
    stage: 'desktop-electron-builder-dry-run-entry',
    shellLocalOnly: true,
    recommendedTool: recommendation.recommended,
    builderConfigPath,
    hasBuilder,
    command: `npx electron-builder --dir --config "${builderConfigPath}"`,
    checks: {
      recommendedBuilder: recommendation.recommended === 'electron-builder',
      builderConfigPresent: fs.existsSync(builderConfigPath),
      builderInstalled: hasBuilder,
    },
    nextActions: hasBuilder
      ? ['run-builder-dry-run-now']
      : ['install-electron-builder', 'run-builder-dry-run-now'],
  };
}
