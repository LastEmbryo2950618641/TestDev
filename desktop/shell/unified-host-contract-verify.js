// Desktop unified host contract verification
import { createDesktopPreloadOptionalRuntimeCall } from './preload-runtime-entry.js';
import { createDesktopExecutorOptionalRuntimeCall } from './executor-runtime-entry.js';
import {
  createDesktopUnifiedHostContract,
  createDesktopUnifiedHostExecutionDraft,
} from './unified-host-contract.js';

export function verifyDesktopUnifiedHostContract(target = globalThis) {
  const contract = createDesktopUnifiedHostContract(target);
  const execution = createDesktopUnifiedHostExecutionDraft(target);
  const preloadEntry = createDesktopPreloadOptionalRuntimeCall(contract.mapper.preloadBridge, target);
  const executorEntry = createDesktopExecutorOptionalRuntimeCall(contract.mapper.mainProcess, target);

  const readyResult = contract.mapper.mainProcess.whenReady();
  const preloadResult = preloadEntry.invoke();
  const executorResult = executorEntry.invoke();
  const windowRef = executorResult.windowResult;
  const focusResult = contract.mapper.mainProcess.focusWindow(windowRef);
  const reloadResult = contract.mapper.mainProcess.reloadRenderer(windowRef);
  const closeResult = contract.mapper.mainProcess.closeWindow(windowRef);

  return {
    runtime: contract.runtime,
    stage: 'desktop-unified-host-contract-verification',
    ready: execution.ready,
    sequence: execution.sequence,
    checkpoints: contract.checkpoints,
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
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifyDesktopUnifiedHostContract();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
