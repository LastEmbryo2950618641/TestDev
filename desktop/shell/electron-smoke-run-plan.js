// Desktop Electron smoke-run plan
// Produces a controlled trial plan and can surface the enabled runtime branch explicitly.
import { createDesktopElectronSmokeRunChecklist } from './electron-smoke-run-checklist.js';
import { createElectronRuntimeBranch } from './electron-main.js';

export async function createDesktopElectronSmokeRunPlan(options = {}, target = globalThis) {
  const enabled = options.enabled === true;
  const checklist = await createDesktopElectronSmokeRunChecklist(target);
  const branch = await createElectronRuntimeBranch({ enabled }, target);

  return {
    runtimeFamily: 'desktop-electron-smoke-run-plan',
    stage: 'desktop-electron-smoke-run-plan',
    shellLocalOnly: true,
    enabled,
    ready: checklist.ready === true,
    willLaunchWindow: enabled && branch.willExecuteRealBootstrap === true,
    fallbackMode: branch.fallbackMode || '',
    prerequisites: checklist.steps,
    executionSteps: branch.steps,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const enabled = process.argv.includes('--enabled');
  const result = await createDesktopElectronSmokeRunPlan({ enabled });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
