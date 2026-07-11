// Desktop executor runtime entry draft
import {
  createDesktopExecutorContract,
  createDesktopExecutorPayload,
  createDesktopExecutorSkeleton,
  createDesktopExecutorRealCallReadyShim,
} from './executor-shim.js';

export function createDesktopExecutorRuntimeEntry(target = globalThis) {
  return {
    runtime: 'electron',
    stage: 'desktop-executor-runtime-entry-draft',
    contract: createDesktopExecutorContract(target),
    skeleton: createDesktopExecutorSkeleton(target),
    shim: createDesktopExecutorRealCallReadyShim(target),
    payload: createDesktopExecutorPayload(target),
  };
}

export function createDesktopExecutorRuntimeInvokeDraft(target = globalThis) {
  const entry = createDesktopExecutorRuntimeEntry(target);
  return {
    readyApi: entry.shim?.prepare?.readyApi || '',
    windowFactory: entry.shim?.prepare?.windowFactory || '',
    preferredLoadApi: entry.shim?.prepare?.preferredLoadApi || '',
    payloadFactory: entry.shim?.prepare?.payloadFactory || '',
    executeWith: entry.shim?.bind?.executeWith || '',
    ready: entry.shim?.ready === true,
  };
}

export function createDesktopExecutorRuntimeInvokeSkeleton(target = globalThis) {
  const entry = createDesktopExecutorRuntimeEntry(target);
  return {
    invokeReady: {
      api: entry.shim?.prepare?.readyApi || '',
      args: [],
    },
    createWindow: {
      factory: entry.shim?.prepare?.windowFactory || '',
      args: ['options-ref:createDesktopExecutorPayload.pipeline.window.options'],
    },
    loadRenderer: {
      api: entry.shim?.prepare?.preferredLoadApi || '',
      args: [entry.payload?.pipeline?.renderer?.entry || ''],
    },
    executeWith: entry.shim?.bind?.executeWith || '',
    ready: entry.shim?.ready === true,
  };
}

export function createDesktopExecutorUltraThinRealCallSkeleton(target = globalThis) {
  const entry = createDesktopExecutorRuntimeEntry(target);
  return {
    callSite: 'future:app.whenReady -> new BrowserWindow(options) -> loadFile/loadURL(entry)',
    invoke: {
      readyApi: entry.shim?.prepare?.readyApi || '',
      windowFactory: entry.shim?.prepare?.windowFactory || '',
      preferredLoadApi: entry.shim?.prepare?.preferredLoadApi || '',
      payloadFactory: entry.shim?.prepare?.payloadFactory || '',
    },
    runtime: {
      executor: entry.shim?.bind?.executeWith || '',
      mode: entry.shim?.bind?.mode || '',
    },
    ready: entry.shim?.ready === true,
  };
}

export function createDesktopExecutorRealCallStyleEntry(target = globalThis) {
  const entry = createDesktopExecutorRuntimeEntry(target);
  return {
    signature: 'ready().then(createWindow).then(loadRenderer)',
    readyApi: entry.shim?.prepare?.readyApi || '',
    windowFactory: entry.shim?.prepare?.windowFactory || '',
    preferredLoadApi: entry.shim?.prepare?.preferredLoadApi || '',
    payload: entry.payload,
    executeWith: entry.shim?.bind?.executeWith || '',
    deferred: true,
    ready: entry.shim?.ready === true,
  };
}

export function createDesktopExecutorOptionalRuntimeCall(runtimeLike, target = globalThis) {
  const entry = createDesktopExecutorRuntimeEntry(target);
  const canCreateWindow = typeof runtimeLike?.createWindow === 'function';
  const canLoad = typeof runtimeLike?.loadRenderer === 'function';
  return {
    readyApi: entry.shim?.prepare?.readyApi || '',
    windowFactory: entry.shim?.prepare?.windowFactory || '',
    preferredLoadApi: entry.shim?.prepare?.preferredLoadApi || '',
    payload: entry.payload,
    canInvoke: canCreateWindow && canLoad,
    invoke() {
      if (!canCreateWindow || !canLoad) {
        return {
          invoked: false,
          reason: 'runtime-missing-createWindow-or-loadRenderer',
          readyApi: entry.shim?.prepare?.readyApi || '',
        };
      }
      const windowResult = runtimeLike.createWindow(entry.payload?.pipeline?.window?.options || {});
      const loadResult = runtimeLike.loadRenderer(entry.payload?.pipeline?.renderer?.entry || '');
      return {
        invoked: true,
        windowResult,
        loadResult,
      };
    },
  };
}

export function createDesktopExecutorRuntimeAdapterEntry(target = globalThis) {
  const entry = createDesktopExecutorRuntimeEntry(target);
  return {
    entry,
    invoke: createDesktopExecutorRuntimeInvokeDraft(target),
    skeleton: createDesktopExecutorRuntimeInvokeSkeleton(target),
    ultraThinCall: createDesktopExecutorUltraThinRealCallSkeleton(target),
    realCallStyle: createDesktopExecutorRealCallStyleEntry(target),
    ready: entry.shim?.ready === true,
  };
}
