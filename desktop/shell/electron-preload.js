import { createElectronPreloadExposePayload } from './preload.js';
import { createOptionalElectronApiAdapter } from './electron-api-adapter.js';
import { createDesktopFileStorageBackend } from './electron-storage-backend.js';

export function createElectronPreloadRuntimeSkeleton(target = globalThis) {
  const payload = createElectronPreloadExposePayload(target);
  return {
    runtime: 'electron',
    stage: 'desktop-electron-preload-runtime-skeleton',
    shellLocalOnly: true,
    namespace: payload.namespace,
    payload,
    exposeApi: 'contextBridge.exposeInMainWorld',
  };
}

export async function createElectronPreloadOptionalRealCall(target = globalThis) {
  const skeleton = createElectronPreloadRuntimeSkeleton(target);
  const adapter = await createOptionalElectronApiAdapter();
  return {
    runtime: skeleton.runtime,
    stage: 'desktop-electron-preload-optional-real-call',
    shellLocalOnly: true,
    available: adapter.available === true,
    reason: adapter.reason || '',
    namespace: skeleton.namespace,
    exposeApi: adapter.available ? 'contextBridge.exposeInMainWorld' : '',
  };
}

export function createElectronStorageExposePayload(options = {}) {
  const backend = options.backend || createDesktopFileStorageBackend(options);
  return {
    readSettings(key) {
      return backend.readSettings(key);
    },
    writeSettings(key, patch) {
      return backend.writeSettings(key, patch);
    },
    readRaw(slot) {
      return backend.readRaw(slot);
    },
    writeRaw(slot, raw) {
      return backend.writeRaw(slot, raw);
    },
    removeRaw(slot) {
      return backend.removeRaw(slot);
    },
    root: backend.root,
  };
}

export function createElectronPreloadFullExposePayload(target = globalThis, options = {}) {
  const preloadPayload = createElectronPreloadExposePayload(target);
  return {
    ...preloadPayload,
    storage: createElectronStorageExposePayload(options),
  };
}

export function createElectronPreloadExposeExecutionPlan(target = globalThis, options = {}) {
  const payload = createElectronPreloadFullExposePayload(target, options);
  return {
    runtime: 'electron',
    stage: 'desktop-electron-preload-expose-execution-plan',
    shellLocalOnly: true,
    namespace: payload.namespace,
    exposeApi: 'contextBridge.exposeInMainWorld',
    payload,
  };
}

export function runElectronPreloadExpose(runtimeLike = {}, target = globalThis, options = {}) {
  const plan = createElectronPreloadExposeExecutionPlan(target, options);
  const expose = runtimeLike?.exposeInMainWorld;
  if (typeof expose !== 'function') {
    return {
      invoked: false,
      namespace: plan.namespace,
      reason: 'runtime-missing-exposeInMainWorld',
      plan,
    };
  }

  const result = expose(plan.namespace, plan.payload);
  return {
    invoked: true,
    namespace: plan.namespace,
    result,
    plan,
  };
}
