// Desktop electron-like runtime verification draft
import { createDesktopPreloadOptionalRuntimeCall } from './preload-runtime-entry.js';
import { createDesktopExecutorOptionalRuntimeCall } from './executor-runtime-entry.js';

export function verifyDesktopElectronLikeRuntime() {
  const calls = [];

  const electronLikeRuntime = {
    lifecycle: {
      ready: false,
    },
    exposeInMainWorld(namespace, payload) {
      calls.push({ type: 'exposeInMainWorld', namespace, payload });
      return { ok: true, namespace };
    },
    whenReady() {
      this.lifecycle.ready = true;
      calls.push({ type: 'whenReady' });
      return { ok: true };
    },
    createWindow(options) {
      calls.push({ type: 'createWindow', options });
      return { ok: true, options };
    },
    loadRenderer(entry) {
      calls.push({ type: 'loadRenderer', entry });
      return { ok: true, entry };
    },
  };

  const preloadEntry = createDesktopPreloadOptionalRuntimeCall(electronLikeRuntime, globalThis);
  const executorEntry = createDesktopExecutorOptionalRuntimeCall(electronLikeRuntime, globalThis);

  const readyResult = electronLikeRuntime.whenReady();
  const preloadResult = preloadEntry.invoke();
  const executorResult = executorEntry.invoke();

  return {
    lifecycle: electronLikeRuntime.lifecycle,
    readyResult,
    preload: {
      canInvoke: preloadEntry.canInvoke,
      result: preloadResult,
    },
    executor: {
      canInvoke: executorEntry.canInvoke,
      result: executorResult,
    },
    calls,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifyDesktopElectronLikeRuntime();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
