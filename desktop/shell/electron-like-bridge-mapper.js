// Desktop Electron-like bridge mapper draft
// Keeps host-specific window lifecycle calls inside desktop shell so shared gameplay stays untouched.

function inferLoadStrategy(entry) {
  const normalized = String(entry || '');
  return normalized.startsWith('http') ? 'load-url' : 'load-file';
}

function createWindowHandle(record, state) {
  return {
    id: 'main-window',
    focus() {
      state.windowFocused = true;
      return record('focusWindow', { windowId: this.id, ok: true });
    },
    reload() {
      state.rendererReloaded = true;
      return record('reloadRenderer', {
        windowId: this.id,
        entry: state.rendererEntry,
        ok: true,
      });
    },
    close() {
      state.windowClosed = true;
      return record('closeWindow', { windowId: this.id, ok: true });
    },
  };
}

export function createDesktopElectronLikeBridgeMapper() {
  const calls = [];
  const state = {
    ready: false,
    exposed: false,
    windowCreated: false,
    windowFocused: false,
    windowClosed: false,
    rendererLoaded: false,
    rendererReloaded: false,
    rendererEntry: '',
    windowId: '',
  };

  function record(type, payload = {}) {
    const event = { index: calls.length + 1, type, ...payload };
    calls.push(event);
    return event;
  }

  const windowHandle = createWindowHandle(record, state);

  return {
    runtime: 'electron',
    stage: 'desktop-electron-like-bridge-mapper-draft',
    calls,
    state,
    preloadBridge: {
      exposeInMainWorld(namespace, payload) {
        state.exposed = true;
        return record('exposeInMainWorld', { namespace, payload, ok: true });
      },
    },
    mainProcess: {
      whenReady() {
        state.ready = true;
        return record('whenReady', { ok: true });
      },
      createWindow(options) {
        state.windowCreated = true;
        state.windowId = windowHandle.id;
        record('createWindow', {
          windowId: windowHandle.id,
          options,
          ok: true,
        });
        return windowHandle;
      },
      loadRenderer(entry) {
        state.rendererLoaded = true;
        state.rendererEntry = String(entry || '');
        return record('loadRenderer', {
          entry: state.rendererEntry,
          strategy: inferLoadStrategy(entry),
          ok: true,
        });
      },
      focusWindow(windowRef) {
        return windowRef?.focus?.() || record('focusWindowSkipped', { reason: 'missing-window-ref' });
      },
      reloadRenderer(windowRef) {
        return windowRef?.reload?.() || record('reloadRendererSkipped', { reason: 'missing-window-ref' });
      },
      closeWindow(windowRef) {
        return windowRef?.close?.() || record('closeWindowSkipped', { reason: 'missing-window-ref' });
      },
    },
  };
}

export function createDesktopElectronLikeBridgeChecklist() {
  return {
    runtime: 'electron',
    stage: 'desktop-electron-like-bridge-mapper-checklist',
    responsibilities: [
      'host-ready-mapping',
      'preload-expose-mapping',
      'window-create-mapping',
      'renderer-load-mapping',
      'window-focus-mapping',
      'renderer-reload-mapping',
      'window-close-mapping',
    ],
    shellLocalOnly: true,
    publishTouched: false,
  };
}
