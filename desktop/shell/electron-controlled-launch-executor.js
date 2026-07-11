// Desktop Electron controlled launch executor skeleton
// Bridges launch preview and result recording without launching a real window yet.
import { createElectronLaunchPreview } from './electron-launch-preview.js';
import { createDesktopElectronSmokeRunResultSkeleton } from './electron-smoke-run-result.js';

export async function createDesktopElectronControlledLaunchExecutor(target = globalThis) {
  const preview = await createElectronLaunchPreview(target);
  const result = createDesktopElectronSmokeRunResultSkeleton();

  return {
    runtimeFamily: 'desktop-electron-controlled-launch-executor',
    stage: 'desktop-electron-controlled-launch-executor',
    shellLocalOnly: true,
    willExecuteRealBootstrap: preview.willExecuteRealBootstrap === true,
    plannedCalls: preview.plannedCalls,
    result,
    executeMode: preview.willExecuteRealBootstrap ? 'ready-for-live-window-launch' : 'preview-only',
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const output = await createDesktopElectronControlledLaunchExecutor();
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}
