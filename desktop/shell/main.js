// Electron main draft
// Structured to mirror a future Electron app lifecycle without importing Electron yet.

function normalizeDraftPath(pathValue) {
  return String(pathValue || '').replace(/\\/g, '/');
}

export function createElectronMainDraft() {
  return {
    runtime: 'electron',
    stage: 'desktop-entry-draft',
    windows: ['main'],
    preload: 'preload.js',
    sharedEntry: 'publish/index.html',
  };
}

export function createMainWindowDraft() {
  return {
    id: 'main',
    title: 'Game Window',
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    preload: 'preload.js',
    url: 'publish/index.html',
  };
}

export function createElectronAppLifecycleDraft() {
  return {
    boot: ['resolve-config', 'wait-for-app-ready'],
    windowing: ['create-main-window'],
    loading: ['resolve-renderer-entry', 'load-renderer-entry'],
    shutdown: ['window-all-closed', 'before-quit'],
  };
}

export function createWindowLoadDraft(windowDraft = createMainWindowDraft()) {
  const entry = normalizeDraftPath(windowDraft.url);
  const preload = normalizeDraftPath(windowDraft.preload);
  return {
    windowId: windowDraft.id,
    preload,
    entry,
    loadStrategy: entry.startsWith('http') ? 'load-url' : 'load-file',
    browserWindowOptions: {
      title: windowDraft.title,
      width: windowDraft.width,
      height: windowDraft.height,
      minWidth: windowDraft.minWidth,
      minHeight: windowDraft.minHeight,
      webPreferences: {
        preload,
        contextIsolation: true,
        nodeIntegration: false,
      },
    },
  };
}

export function createElectronBootstrapDraft() {
  const windowDraft = createMainWindowDraft();
  return {
    runtime: 'electron',
    main: createElectronMainDraft(),
    lifecycle: createElectronAppLifecycleDraft(),
    window: windowDraft,
    load: createWindowLoadDraft(windowDraft),
  };
}
