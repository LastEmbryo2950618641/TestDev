// Mobile unified host contract verification
import { createMobileOptionalRuntimeCall } from './runtime-entry.js';
import {
  createMobileUnifiedHostContract,
  createMobileUnifiedHostExecutionDraft,
} from './unified-host-contract.js';

export function verifyMobileUnifiedHostContract(target = globalThis) {
  const contract = createMobileUnifiedHostContract(target);
  const execution = createMobileUnifiedHostExecutionDraft(target);
  const runtimeEntry = createMobileOptionalRuntimeCall(contract.mapper.runtimeLike, target);

  const readyResult = contract.mapper.lifecycle.onReady();
  const invokeResult = runtimeEntry.invoke();
  const webviewRef = invokeResult.webviewResult;
  const focusResult = contract.mapper.runtimeLike.focusWebView(webviewRef);
  const reloadResult = contract.mapper.runtimeLike.reloadRenderer(webviewRef);
  const destroyResult = contract.mapper.runtimeLike.destroyWebView(webviewRef);

  return {
    runtime: contract.runtime,
    stage: 'mobile-unified-host-contract-verification',
    ready: execution.ready,
    sequence: execution.sequence,
    checkpoints: contract.checkpoints,
    runtimeEntry: {
      canInvoke: runtimeEntry.canInvoke,
      result: invokeResult,
    },
    behavior: {
      readyResult,
      focusResult,
      reloadResult,
      destroyResult,
    },
    calls: contract.mapper.calls,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifyMobileUnifiedHostContract();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
