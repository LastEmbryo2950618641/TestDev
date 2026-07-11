import { createDesktopElectronOptionalLiveExecutor } from './electron-optional-live-executor.js';

export async function verifyDesktopElectronOptionalLiveExecutor() {
  const disabledExecutor = await createDesktopElectronOptionalLiveExecutor({ enabled: false });
  const enabledExecutor = await createDesktopElectronOptionalLiveExecutor({ enabled: true });
  return {
    disabledExecutor,
    enabledExecutor,
    checks: {
      disabledPreviewOnly: disabledExecutor.executeMode === 'preview-only',
      enabledExecutorShapeReady: Array.isArray(enabledExecutor.plannedCalls),
      resultShapeReady: typeof enabledExecutor.result?.checks?.windowCreated === 'boolean',
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const output = await verifyDesktopElectronOptionalLiveExecutor();
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}
