import { createDesktopPackagingToolchainPreflight } from './desktop-packaging-toolchain-preflight.js';

export function verifyDesktopPackagingToolchainPreflight() {
  const result = createDesktopPackagingToolchainPreflight();
  return {
    ...result,
    checks: {
      ...result.checks,
      readyForToolInstall: result.checks.packageMainReady === true && result.checks.windowsTargetReady === true && result.checks.filesReady === true,
    },
  };
}
