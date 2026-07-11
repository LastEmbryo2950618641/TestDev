import { createDesktopElectronSmokeRunLauncher } from './electron-smoke-run-launcher.js';
import { createDesktopElectronSmokeRunResultSkeleton } from './electron-smoke-run-result.js';

export async function verifyDesktopElectronSmokeRunLauncher() {
  const disabledLauncher = await createDesktopElectronSmokeRunLauncher({ enabled: false });
  const enabledLauncher = await createDesktopElectronSmokeRunLauncher({ enabled: true });
  const resultSkeleton = createDesktopElectronSmokeRunResultSkeleton();

  return {
    disabledLauncher,
    enabledLauncher,
    resultSkeleton,
    checks: {
      disabledDoesNotLaunch: disabledLauncher.willLaunchWindow === false,
      enabledHasSteps: Array.isArray(enabledLauncher.executionSteps) && enabledLauncher.executionSteps.length > 0,
      resultShapeReady: typeof resultSkeleton.checks?.windowCreated === 'boolean',
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = await verifyDesktopElectronSmokeRunLauncher();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
