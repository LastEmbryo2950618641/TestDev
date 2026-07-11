// Desktop Electron smoke-run launcher
// Produces a guarded launch decision without opening a real window by default.
import { createDesktopElectronSmokeRunPlan } from './electron-smoke-run-plan.js';

export async function createDesktopElectronSmokeRunLauncher(options = {}, target = globalThis) {
  const plan = await createDesktopElectronSmokeRunPlan(options, target);
  return {
    runtimeFamily: 'desktop-electron-smoke-run-launcher',
    stage: 'desktop-electron-smoke-run-launcher',
    shellLocalOnly: true,
    enabled: plan.enabled === true,
    ready: plan.ready === true,
    willLaunchWindow: plan.willLaunchWindow === true,
    launchMode: plan.enabled ? 'guarded-electron-branch' : 'planning-only',
    executionSteps: plan.executionSteps,
  };
}
