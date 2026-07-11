// Desktop electron-like adapter verification draft
import { createDesktopPreloadOptionalRuntimeCall } from './preload-runtime-entry.js';
import { createDesktopExecutorOptionalRuntimeCall } from './executor-runtime-entry.js';

function createElectronLikeAdapter() {
  const calls = [];
  const state = {
    ready: false,
    exposed: false,
    windowCreated: false,
    rendererLoaded: false,
  };

  return {
    calls,
    state,
    preloadBridge: {
      exposeInMainWorld(namespace, payload) {
        state.exposed = true;
        calls.push({ type: 'exposeInMainWorld', namespace, payload });
        return { ok: true, namespace };
      },
    },
    mainProcess: {
      whenReady() {
        state.ready = true;
        calls.push({ type: 'whenReady' });
        return { ok: true };
      },
      createWindow(options) {
        state.windowCreated = true;
        calls.push({ type: 'createWindow', options });
        return { ok: true, options };
      },
      loadRenderer(entry) {
        state.rendererLoaded = true;
        calls.push({ type: 'loadRenderer', entry });
        return { ok: true, entry };
      },
    },
  };
}

export function verifyDesktopElectronLikeAdapter() {
  const adapter = createElectronLikeAdapter();

  const preloadEntry = createDesktopPreloadOptionalRuntimeCall(adapter.preloadBridge, globalThis);
  const executorEntry = createDesktopExecutorOptionalRuntimeCall(adapter.mainProcess, globalThis);

  const readyResult = adapter.mainProcess.whenReady();
  const preloadResult = preloadEntry.invoke();
  const executorResult = executorEntry.invoke();

  return {
    state: adapter.state,
    readyResult,
    preload: {
      canInvoke: preloadEntry.canInvoke,
      result: preloadResult,
    },
    executor: {
      canInvoke: executorEntry.canInvoke,
      result: executorResult,
    },
    calls: adapter.calls,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifyDesktopElectronLikeAdapter();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
