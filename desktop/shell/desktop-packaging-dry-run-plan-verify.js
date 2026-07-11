import { createDesktopPackagingDryRunPlan } from './desktop-packaging-dry-run-plan.js';

export function verifyDesktopPackagingDryRunPlan() {
  const result = createDesktopPackagingDryRunPlan();
  return {
    ...result,
    checks: {
      ...result.checks,
      readyForToolInstall: result.checks.configReady === true && result.checks.publishBundleReady === true,
    },
  };
}
