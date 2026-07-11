// Desktop Electron optional live executor
// Exposes the final real-call execution seam while keeping live execution opt-in.
import { createDesktopElectronControlledLaunchExecutor } from './electron-controlled-launch-executor.js';

export async function createDesktopElectronOptionalLiveExecutor(options = {}, target = globalThis) {
  const enabled = options.enabled === true;
  const executor = await createDesktopElectronControlledLaunchExecutor(target);
  return {
    runtimeFamily: 'desktop-electron-optional-live-executor',
    stage: 'desktop-electron-optional-live-executor',
    shellLocalOnly: true,
    enabled,
    executeMode: enabled && executor.willExecuteRealBootstrap ? 'ready-to-launch-real-window' : 'preview-only',
    plannedCalls: executor.plannedCalls,
    result: executor.result,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const output = await createDesktopElectronOptionalLiveExecutor({ enabled: true });
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}
