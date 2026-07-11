// Desktop electron window behavior verification draft
import { createDesktopPreloadOptionalRuntimeCall } from './preload-runtime-entry.js';
import { createDesktopExecutorOptionalRuntimeCall } from './executor-runtime-entry.js';

function createElectronWindowBehaviorAdapter() {
  const calls = [];
  const state = {
    ready: false,
    exposed: false,
    windowCreated: false,
    windowFocused: false,
    windowClosed: false,
    rendererLoaded: false,
    rendererReloaded: false,
    windowId: null,
    rendererEntry: '',
  };

  function record(type, payload = {}) {
    const entry = { index: calls.length + 1, type, ...payload };
    calls.push(entry);
    return entry;
  }

  const windowHandle = {
    id: 'main-window',
    focus() {
      state.windowFocused = true;
      return record('focusWindow', { windowId: this.id, ok: true });
    },
    close() {
      state.windowClosed = true;
      return record('closeWindow', { windowId: this.id, ok: true });
    },
    reload() {
      state.rendererReloaded = true;
      return record('reloadRenderer', {
        windowId: this.id,
        entry: state.rendererEntry,
        ok: true,
      });
    },
  };

  return {
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
        record('createWindow', { options, windowId: windowHandle.id, ok: true });
        return windowHandle;
      },
      loadRenderer(entry) {
        state.rendererLoaded = true;
        state.rendererEntry = entry;
        return record('loadRenderer', {
          entry,
          strategy: entry?.startsWith('http') ? 'load-url' : 'load-file',
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

export function verifyDesktopElectronWindowBehavior() {
  const adapter = createElectronWindowBehaviorAdapter();
  const preloadEntry = createDesktopPreloadOptionalRuntimeCall(adapter.preloadBridge, globalThis);
  const executorEntry = createDesktopExecutorOptionalRuntimeCall(adapter.mainProcess, globalThis);

  const readyResult = adapter.mainProcess.whenReady();
  const preloadResult = preloadEntry.invoke();
  const executorResult = executorEntry.invoke();
  const windowRef = executorResult.windowResult;
  const focusResult = adapter.mainProcess.focusWindow(windowRef);
  const reloadResult = adapter.mainProcess.reloadRenderer(windowRef);
  const closeResult = adapter.mainProcess.closeWindow(windowRef);

  return {
    runtime: 'electron',
    stage: 'desktop-electron-window-behavior-verification',
    state: adapter.state,
    preload: {
      canInvoke: preloadEntry.canInvoke,
      result: preloadResult,
    },
    executor: {
      canInvoke: executorEntry.canInvoke,
      result: executorResult,
    },
    behavior: {
      readyResult,
      focusResult,
      reloadResult,
      closeResult,
    },
    checkpoints: {
      ready: adapter.state.ready,
      exposed: adapter.state.exposed,
      windowCreated: adapter.state.windowCreated,
      rendererLoaded: adapter.state.rendererLoaded,
      windowFocused: adapter.state.windowFocused,
      rendererReloaded: adapter.state.rendererReloaded,
      windowClosed: adapter.state.windowClosed,
    },
    calls: adapter.calls,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifyDesktopElectronWindowBehavior();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
