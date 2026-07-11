// Desktop bootstrap draft
import {
  createElectronMainDraft,
  createMainWindowDraft,
  createElectronBootstrapDraft,
  createElectronAppLifecycleDraft,
  createWindowLoadDraft,
} from './main.js';
import {
  createElectronPreloadDraft,
  createElectronExposeBridgeDraft,
  createElectronPreloadBridgeAssembly,
  createElectronHandshakePayload,
} from './preload.js';

export function createDesktopBootstrapManifest(target = globalThis) {
  const windowDraft = createMainWindowDraft();
  return {
    runtime: 'electron',
    stage: 'desktop-bootstrap-draft',
    main: createElectronMainDraft(),
    lifecycle: createElectronAppLifecycleDraft(),
    window: windowDraft,
    load: createWindowLoadDraft(windowDraft),
    preload: createElectronPreloadDraft(),
    expose: createElectronExposeBridgeDraft(),
    assembly: createElectronPreloadBridgeAssembly(target),
    handshake: createElectronHandshakePayload(target),
  };
}

export function createDesktopBootstrapDraft(target = globalThis) {
  const manifest = createDesktopBootstrapManifest(target);
  return {
    manifest,
    bootstrap: createElectronBootstrapDraft(),
    checkpoints: {
      hostEntryReady: Boolean(manifest.main?.runtime),
      lifecycleReady: Array.isArray(manifest.lifecycle?.boot),
      windowReady: Boolean(manifest.window?.id),
      loadReady: Boolean(manifest.load?.entry),
      preloadReady: Boolean(manifest.preload?.runtime),
      bridgeReady: Boolean(manifest.expose?.namespace),
      assemblyReady: Boolean(manifest.assembly?.namespace),
    },
  };
}
