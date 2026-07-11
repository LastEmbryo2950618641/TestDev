import { createDesktopElectronSmokeRunPlan } from './electron-smoke-run-plan.js';

export async function verifyDesktopElectronSmokeRunPlan() {
  const disabledPlan = await createDesktopElectronSmokeRunPlan({ enabled: false });
  const enabledPlan = await createDesktopElectronSmokeRunPlan({ enabled: true });

  return {
    disabledPlan,
    enabledPlan,
    checks: {
      prerequisitesPresent: Array.isArray(disabledPlan.prerequisites) && disabledPlan.prerequisites.length > 0,
      executionStepsPresent: Array.isArray(enabledPlan.executionSteps) && enabledPlan.executionSteps.length > 0,
      disabledDoesNotLaunch: disabledPlan.willLaunchWindow === false,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = await verifyDesktopElectronSmokeRunPlan();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
