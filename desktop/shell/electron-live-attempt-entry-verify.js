import { createDesktopElectronSmokeRunPlan } from './electron-smoke-run-plan.js';

export async function verifyDesktopElectronLiveAttemptEntry() {
  const disabledPlan = await createDesktopElectronSmokeRunPlan({ enabled: false });
  const enabledPlan = await createDesktopElectronSmokeRunPlan({ enabled: true });
  return {
    runtimeFamily: 'desktop-electron-live-attempt-entry-verify',
    stage: 'desktop-electron-live-attempt-entry-verify',
    disabledPlan,
    enabledPlan,
    note: 'attempt:live can now surface the enabled runtime branch explicitly, but it still reports a plan rather than launching a real window',
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = await verifyDesktopElectronLiveAttemptEntry();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
