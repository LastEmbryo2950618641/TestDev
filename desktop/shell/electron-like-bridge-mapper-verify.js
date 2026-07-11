// Desktop Electron-like bridge mapper verification
import { createDesktopPreloadOptionalRuntimeCall } from './preload-runtime-entry.js';
import { createDesktopExecutorOptionalRuntimeCall } from './executor-runtime-entry.js';
import {
  createDesktopElectronLikeBridgeChecklist,
  createDesktopElectronLikeBridgeMapper,
} from './electron-like-bridge-mapper.js';

export function verifyDesktopElectronLikeBridgeMapper() {
  const mapper = createDesktopElectronLikeBridgeMapper();
  const checklist = createDesktopElectronLikeBridgeChecklist();
  const preloadEntry = createDesktopPreloadOptionalRuntimeCall(mapper.preloadBridge, globalThis);
  const executorEntry = createDesktopExecutorOptionalRuntimeCall(mapper.mainProcess, globalThis);

  const readyResult = mapper.mainProcess.whenReady();
  const preloadResult = preloadEntry.invoke();
  const executorResult = executorEntry.invoke();
  const windowRef = executorResult.windowResult;
  const focusResult = mapper.mainProcess.focusWindow(windowRef);
  const reloadResult = mapper.mainProcess.reloadRenderer(windowRef);
  const closeResult = mapper.mainProcess.closeWindow(windowRef);

  return {
    runtime: mapper.runtime,
    stage: 'desktop-electron-like-bridge-mapper-verification',
    checklist,
    state: mapper.state,
    preload: {
      canInvoke: preloadEntry.canInvoke,
      result: preloadResult,
    },
    executor: {
      canInvoke: executorEntry.canInvoke,
      result: executorResult,
    },
    behavior: {
      readyResult,
      focusResult,
      reloadResult,
      closeResult,
    },
    calls: mapper.calls,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifyDesktopElectronLikeBridgeMapper();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
