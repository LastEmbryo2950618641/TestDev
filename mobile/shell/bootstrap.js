// Mobile bootstrap draft
import { mobileHostBridge } from './bridge/host.js';
import { mobileFilesBridge } from './bridge/files.js';
import { mobileStorageBridge } from './bridge/storage.js';
import { mobileAssetsBridge } from './bridge/assets.js';
import { mobileKeysBridge } from './bridge/keys.js';

function createMobileWindowDraft() {
  return {
    id: 'main-webview',
    title: 'Game WebView',
    container: 'android-webview',
    entry: 'publish/index.html',
  };
}

function createMobileLifecycleDraft() {
  return {
    boot: ['resolve-host-shell', 'wait-for-webview-ready'],
    windowing: ['attach-main-webview'],
    loading: ['resolve-renderer-entry', 'load-renderer-entry'],
    shutdown: ['pause-app', 'destroy-webview'],
  };
}

function createMobileBridgeAssembly(target = globalThis) {
  return {
    namespace: 'platformBridge',
    host: mobileHostBridge,
    files: mobileFilesBridge,
    storage: mobileStorageBridge,
    assets: mobileAssetsBridge,
    keys: mobileKeysBridge,
    capabilities: {
      host: mobileHostBridge.capabilities(target),
      files: { supported: false },
      storage: { supported: true },
      assets: { supported: false },
      keys: { supported: false },
    },
  };
}

export function createMobileBootstrapManifest(target = globalThis) {
  const windowDraft = createMobileWindowDraft();
  return {
    runtime: 'mobile-webview',
    stage: 'mobile-bootstrap-draft',
    lifecycle: createMobileLifecycleDraft(),
    window: windowDraft,
    load: {
      windowId: windowDraft.id,
      entry: windowDraft.entry,
      loadStrategy: 'webview-load-url',
    },
    assembly: createMobileBridgeAssembly(target),
  };
}

export function createMobileBootstrapDraft(target = globalThis) {
  const manifest = createMobileBootstrapManifest(target);
  return {
    manifest,
    checkpoints: {
      lifecycleReady: Array.isArray(manifest.lifecycle?.boot),
      windowReady: Boolean(manifest.window?.id),
      loadReady: Boolean(manifest.load?.entry),
      assemblyReady: Boolean(manifest.assembly?.namespace),
    },
  };
}
