import { createDesktopPackagingToolchainPreflight } from './desktop-packaging-toolchain-preflight.js';

export function createDesktopPackagingToolRecommendation() {
  const preflight = createDesktopPackagingToolchainPreflight();
  const hasBuilder = preflight.checks?.hasElectronBuilder === true;
  const hasForge = preflight.checks?.hasElectronForge === true;

  let recommended = 'electron-builder';
  let reason = 'prefer-minimal-portable-first';

  if (hasBuilder) {
    recommended = 'electron-builder';
    reason = 'builder-already-present';
  } else if (hasForge) {
    recommended = 'electron-forge';
    reason = 'forge-already-present';
  }

  return {
    runtimeFamily: 'desktop-packaging-tool-recommendation',
    stage: 'desktop-packaging-tool-recommendation',
    shellLocalOnly: true,
    recommended,
    reason,
    decision: {
      currentPreferredOutput: 'windows-portable',
      existingPackagingConfigAligned: recommended === 'electron-builder',
      currentDesktopStage: 'packaging-prep-ready',
    },
    nextActions: recommended === 'electron-builder'
      ? ['install-electron-builder', 'bind-builder-config', 'run-builder-dry-run']
      : ['bind-forge-config', 'run-forge-dry-run'],
  };
}
