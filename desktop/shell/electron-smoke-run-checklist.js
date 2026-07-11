// Desktop Electron smoke-run checklist
// Focuses on the smallest controlled validation path before trying a real Electron run.
import { createDesktopPlatformExecutionChecklist } from './platform-execution-checklist-entry.js';
import { createElectronRuntimeBranch, createElectronRuntimeSkeleton } from './electron-main.js';
import { createElectronPreloadRuntimeSkeleton } from './electron-preload.js';

export async function createDesktopElectronSmokeRunChecklist(target = globalThis) {
  const executionChecklist = createDesktopPlatformExecutionChecklist(target);
  const runtimeSkeleton = createElectronRuntimeSkeleton(target);
  const preloadSkeleton = createElectronPreloadRuntimeSkeleton(target);
  const enabledBranch = await createElectronRuntimeBranch({ enabled: true }, target);

  const steps = [
    {
      key: 'window-create',
      priority: 1,
      action: 'verify BrowserWindow options and guarded bootstrap create step',
      ready: Boolean(runtimeSkeleton.browserWindowOptions?.webPreferences?.preload),
      evidence: enabledBranch.steps?.[1] || '',
    },
    {
      key: 'preload-expose',
      priority: 2,
      action: 'verify preload namespace and expose entry shape',
      ready: Boolean(preloadSkeleton.namespace && preloadSkeleton.exposeApi),
      evidence: preloadSkeleton.exposeApi,
    },
    {
      key: 'renderer-load',
      priority: 3,
      action: 'verify renderer entry path and load strategy',
      ready: Boolean(runtimeSkeleton.rendererLoad?.entry && runtimeSkeleton.rendererLoad?.strategy),
      evidence: runtimeSkeleton.rendererLoad?.entry || '',
    },
  ];

  return {
    runtimeFamily: 'desktop-electron-smoke-run-checklist',
    stage: 'desktop-electron-smoke-run-checklist',
    shellLocalOnly: true,
    executionChecklist,
    enabledBranch,
    steps,
    ready: steps.every((step) => step.ready === true),
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = await createDesktopElectronSmokeRunChecklist();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
