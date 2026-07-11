// Desktop unified host contract draft
// Aggregates main/preload drafts into one shell-local host contract for future Electron replacement.
import {
  createElectronMainDraft,
  createElectronAppLifecycleDraft,
  createMainWindowDraft,
  createWindowLoadDraft,
} from './main.js';
import {
  createElectronPreloadDraft,
  createElectronExposeBridgeDraft,
  createElectronPreloadBridgeAssembly,
  createElectronHandshakePayload,
} from './preload.js';
import {
  createDesktopElectronLikeBridgeChecklist,
  createDesktopElectronLikeBridgeMapper,
} from './electron-like-bridge-mapper.js';

export function createDesktopUnifiedHostContract(target = globalThis) {
  const main = createElectronMainDraft();
  const lifecycle = createElectronAppLifecycleDraft();
  const windowDraft = createMainWindowDraft();
  const load = createWindowLoadDraft(windowDraft);
  const preload = createElectronPreloadDraft();
  const expose = createElectronExposeBridgeDraft();
  const assembly = createElectronPreloadBridgeAssembly(target);
  const handshake = createElectronHandshakePayload(target);
  const mapper = createDesktopElectronLikeBridgeMapper();
  const checklist = createDesktopElectronLikeBridgeChecklist();

  return {
    runtime: 'electron',
    stage: 'desktop-unified-host-contract-draft',
    shellLocalOnly: true,
    publishTouched: false,
    main,
    lifecycle,
    window: windowDraft,
    load,
    preload,
    expose,
    assembly,
    handshake,
    mapper: {
      runtime: mapper.runtime,
      stage: mapper.stage,
      responsibilities: checklist.responsibilities,
      preloadBridge: mapper.preloadBridge,
      mainProcess: mapper.mainProcess,
    },
    checkpoints: {
      mainReady: Boolean(main.runtime),
      lifecycleReady: Array.isArray(lifecycle.boot) && lifecycle.boot.length > 0,
      windowReady: Boolean(windowDraft.id),
      loadReady: Boolean(load.entry),
      preloadReady: Boolean(preload.runtime),
      exposeReady: Boolean(expose.namespace),
      assemblyReady: Boolean(assembly.namespace),
      handshakeReady: handshake.bridgeReady === true,
      mapperReady: checklist.shellLocalOnly === true,
    },
  };
}

export function createDesktopUnifiedHostExecutionDraft(target = globalThis) {
  const contract = createDesktopUnifiedHostContract(target);
  return {
    runtime: contract.runtime,
    stage: 'desktop-unified-host-execution-draft',
    sequence: [
      'app.whenReady',
      'contextBridge.exposeInMainWorld',
      'BrowserWindow.create',
      contract.load.loadStrategy === 'load-url' ? 'BrowserWindow.loadURL' : 'BrowserWindow.loadFile',
      'BrowserWindow.focus',
      'webContents.reload',
      'BrowserWindow.close',
    ],
    contract,
    ready: Object.values(contract.checkpoints).every(Boolean),
  };
}
