// Electron runtime launch preview
// Provides a shell-local preview of the actual Electron calls that would run next.
import { createElectronRuntimeBranch, createElectronRuntimeSkeleton } from './electron-main.js';

export async function createElectronLaunchPreview(target = globalThis) {
  const skeleton = createElectronRuntimeSkeleton(target);
  const branch = await createElectronRuntimeBranch({ enabled: true }, target);
  return {
    runtime: 'electron',
    stage: 'desktop-electron-launch-preview',
    shellLocalOnly: true,
    willExecuteRealBootstrap: branch.willExecuteRealBootstrap === true,
    plannedCalls: branch.willExecuteRealBootstrap
      ? [
          {
            api: 'app.whenReady',
            args: [],
          },
          {
            api: 'new BrowserWindow',
            args: [skeleton.browserWindowOptions],
          },
          {
            api: 'browserWindow.loadFile',
            args: [skeleton.rendererLoad.entry],
          },
        ]
      : [],
    fallbackMode: branch.fallbackMode || '',
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = await createElectronLaunchPreview();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
