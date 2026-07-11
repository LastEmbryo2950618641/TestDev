// Desktop preload runtime entry draft
import {
  createElectronPreloadExposeContract,
  createElectronPreloadExposePayload,
  createElectronPreloadExposeSkeleton,
  createElectronPreloadRealCallReadyShim,
} from './preload.js';

export function createDesktopPreloadRuntimeEntry(target = globalThis) {
  return {
    runtime: 'electron',
    stage: 'desktop-preload-runtime-entry-draft',
    contract: createElectronPreloadExposeContract(target),
    skeleton: createElectronPreloadExposeSkeleton(target),
    shim: createElectronPreloadRealCallReadyShim(target),
    payload: createElectronPreloadExposePayload(target),
  };
}

export function createDesktopPreloadRuntimeInvokeDraft(target = globalThis) {
  const entry = createDesktopPreloadRuntimeEntry(target);
  return {
    api: entry.shim?.prepare?.api || '',
    namespace: entry.shim?.prepare?.namespace || '',
    payloadFactory: entry.shim?.prepare?.payloadFactory || '',
    executeWith: entry.shim?.bind?.executeWith || '',
    ready: entry.shim?.ready === true,
  };
}

export function createDesktopPreloadRuntimeInvokeSkeleton(target = globalThis) {
  const entry = createDesktopPreloadRuntimeEntry(target);
  return {
    invoke: {
      api: entry.shim?.prepare?.api || '',
      args: [entry.payload?.namespace || '', 'payload-ref:createElectronPreloadExposePayload'],
    },
    executeWith: entry.shim?.bind?.executeWith || '',
    ready: entry.shim?.ready === true,
  };
}

export function createDesktopPreloadUltraThinRealCallSkeleton(target = globalThis) {
  const entry = createDesktopPreloadRuntimeEntry(target);
  return {
    callSite: 'future:contextBridge.exposeInMainWorld(namespace, payload)',
    invoke: {
      api: entry.shim?.prepare?.api || '',
      namespace: entry.payload?.namespace || '',
      payloadFactory: entry.shim?.prepare?.payloadFactory || '',
    },
    runtime: {
      executor: entry.shim?.bind?.executeWith || '',
      mode: entry.shim?.bind?.mode || '',
    },
    ready: entry.shim?.ready === true,
  };
}

export function createDesktopPreloadRealCallStyleEntry(target = globalThis) {
  const entry = createDesktopPreloadRuntimeEntry(target);
  return {
    signature: 'expose(namespace, payload)',
    api: entry.shim?.prepare?.api || '',
    namespace: entry.payload?.namespace || '',
    payload: entry.payload,
    executeWith: entry.shim?.bind?.executeWith || '',
    deferred: true,
    ready: entry.shim?.ready === true,
  };
}

export function createDesktopPreloadOptionalRuntimeCall(runtimeLike, target = globalThis) {
  const entry = createDesktopPreloadRuntimeEntry(target);
  const apiName = entry.shim?.prepare?.api || '';
  const namespace = entry.payload?.namespace || '';
  const payload = entry.payload;
  const canInvoke = typeof runtimeLike?.exposeInMainWorld === 'function';
  return {
    api: apiName,
    namespace,
    payload,
    canInvoke,
    invoke() {
      if (!canInvoke) {
        return {
          invoked: false,
          reason: 'runtime-missing-exposeInMainWorld',
          api: apiName,
          namespace,
        };
      }
      return {
        invoked: true,
        args: [namespace, payload],
        result: runtimeLike.exposeInMainWorld(namespace, payload),
      };
    },
  };
}

export function createDesktopPreloadRuntimeAdapterEntry(target = globalThis) {
  const entry = createDesktopPreloadRuntimeEntry(target);
  return {
    entry,
    invoke: createDesktopPreloadRuntimeInvokeDraft(target),
    skeleton: createDesktopPreloadRuntimeInvokeSkeleton(target),
    ultraThinCall: createDesktopPreloadUltraThinRealCallSkeleton(target),
    realCallStyle: createDesktopPreloadRealCallStyleEntry(target),
    ready: entry.shim?.ready === true,
  };
}
