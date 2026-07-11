// Desktop Electron live-attempt result link
// Connects the optional live executor output shape to the live-attempt record shape.
import { createDesktopElectronOptionalLiveExecutor } from './electron-optional-live-executor.js';
import { createDesktopElectronSmokeRunResultSkeleton } from './electron-smoke-run-result.js';

export async function createDesktopElectronLiveAttemptResultLink(target = globalThis) {
  const executor = await createDesktopElectronOptionalLiveExecutor({ enabled: true }, target);
  const result = createDesktopElectronSmokeRunResultSkeleton();

  return {
    runtimeFamily: 'desktop-electron-live-attempt-result-link',
    stage: 'desktop-electron-live-attempt-result-link',
    shellLocalOnly: true,
    executeMode: executor.executeMode,
    plannedCalls: executor.plannedCalls,
    result,
    updateTarget: 'docs/architecture/2026-07-11-desktop-electron-first-live-smoke-run-attempt.md',
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const output = await createDesktopElectronLiveAttemptResultLink();
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}
