// Electron preload draft
import { runDesktopSafeConsumerHandshake } from './safe-consumer-runner-example.js';
import { desktopHostBridge } from './bridge/host.js';
import { desktopFilesBridge } from './bridge/files.js';
import { desktopStorageBridge } from './bridge/storage.js';
import { desktopAssetsBridge } from './bridge/assets.js';
import { desktopKeysBridge } from './bridge/keys.js';

function createBridgeCapabilities(target = globalThis) {
  return {
    host: desktopHostBridge.capabilities(target),
    files: desktopFilesBridge.capabilities(target),
    storage: desktopStorageBridge.capabilities(target),
    assets: desktopAssetsBridge.capabilities(target),
    keys: desktopKeysBridge.capabilities(target),
  };
}

function createIpcChannelDraft() {
  return {
    invoke: {
      files: ['files:readText', 'files:writeText', 'files:pickFile', 'files:saveFile'],
      storage: ['storage:readRaw', 'storage:writeRaw', 'storage:removeRaw', 'storage:readSettings', 'storage:writeSettings'],
      assets: ['assets:loadIndex', 'assets:saveMeta', 'assets:saveImage'],
      keys: ['keys:readDeepseekKey', 'keys:readPixaiKey'],
    },
    send: {
      host: ['host:ready', 'host:focus-window'],
    },
  };
}

function createExposeShimDraft() {
  return {
    exposeApi: 'contextBridge.exposeInMainWorld',
    namespace: 'platformBridge',
    wrapper: 'preload-expose-wrapper',
    payloadSource: 'createElectronPreloadExposePayload',
  };
}

export function createElectronPreloadDraft() {
  return {
    runtime: 'electron',
    stage: 'desktop-preload-draft',
    exposes: ['platformBridge'],
    apiStyle: {
      exposeInMainWorld: 'contextBridge.exposeInMainWorld',
      invoke: 'ipcRenderer.invoke',
      send: 'ipcRenderer.send',
    },
  };
}

export function createElectronExposeBridgeDraft() {
  return {
    namespace: 'platformBridge',
    sections: ['host', 'files', 'storage', 'assets', 'keys', 'handshake'],
    apiStyle: createIpcChannelDraft(),
  };
}

export function createElectronPreloadBridgeAssembly(target = globalThis) {
  return {
    namespace: 'platformBridge',
    host: desktopHostBridge,
    files: desktopFilesBridge,
    storage: desktopStorageBridge,
    assets: desktopAssetsBridge,
    keys: desktopKeysBridge,
    capabilities: createBridgeCapabilities(target),
    ipcChannels: createIpcChannelDraft(),
  };
}

export function createElectronHandshakePayload(target = globalThis) {
  const handshake = runDesktopSafeConsumerHandshake(target);
  return {
    host: handshake.handshake?.hostKind || '',
    bridgeReady: handshake.ready === true,
    fallback: handshake.fallback || 'browser-dev-path',
    consumers: handshake.consumers || [],
  };
}

export function createElectronPreloadExposeContract(target = globalThis) {
  return {
    namespace: 'platformBridge',
    api: createElectronPreloadDraft().apiStyle,
    shim: createExposeShimDraft(),
    bridge: createElectronExposeBridgeDraft(),
    assembly: createElectronPreloadBridgeAssembly(target),
    handshake: createElectronHandshakePayload(target),
  };
}

export function createElectronPreloadExposePayload(target = globalThis) {
  const contract = createElectronPreloadExposeContract(target);
  return {
    namespace: contract.namespace,
    bridge: contract.assembly,
    handshake: contract.handshake,
  };
}

export function createElectronPreloadExposeWrapperDraft(target = globalThis) {
  const contract = createElectronPreloadExposeContract(target);
  return {
    shim: contract.shim,
    payload: createElectronPreloadExposePayload(target),
    ready: Boolean(contract.namespace && contract.bridge?.namespace),
  };
}

export function createElectronPreloadExposeSkeleton(target = globalThis) {
  const wrapper = createElectronPreloadExposeWrapperDraft(target);
  return {
    invokeExpose: {
      api: wrapper.shim?.exposeApi || '',
      args: [wrapper.payload?.namespace || '', 'payload-ref:createElectronPreloadExposePayload'],
    },
    payload: wrapper.payload,
    ready: wrapper.ready === true,
  };
}

export function createElectronPreloadRealCallReadyShim(target = globalThis) {
  const skeleton = createElectronPreloadExposeSkeleton(target);
  return {
    prepare: {
      api: skeleton.invokeExpose?.api || '',
      namespace: skeleton.payload?.namespace || '',
      payloadFactory: 'createElectronPreloadExposePayload',
    },
    bind: {
      mode: 'deferred-real-call',
      executeWith: 'contextBridge-like-runtime',
    },
    ready: skeleton.ready === true,
  };
}

export function bootstrapElectronPreload(target = globalThis) {
  return {
    draft: createElectronPreloadDraft(),
    bridge: createElectronExposeBridgeDraft(),
    assembly: createElectronPreloadBridgeAssembly(target),
    handshake: createElectronHandshakePayload(target),
    contract: createElectronPreloadExposeContract(target),
    wrapper: createElectronPreloadExposeWrapperDraft(target),
    skeleton: createElectronPreloadExposeSkeleton(target),
    realCallReadyShim: createElectronPreloadRealCallReadyShim(target),
  };
}
