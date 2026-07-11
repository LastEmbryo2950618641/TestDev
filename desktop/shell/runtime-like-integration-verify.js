// Desktop runtime-like integration verification draft
import { createDesktopPreloadOptionalRuntimeCall } from './preload-runtime-entry.js';
import { createDesktopExecutorOptionalRuntimeCall } from './executor-runtime-entry.js';

export function verifyDesktopRuntimeLikeIntegration() {
  const calls = [];

  const runtimeLike = {
    exposeInMainWorld(namespace, payload) {
      calls.push({ type: 'exposeInMainWorld', namespace, payload });
      return { ok: true, namespace };
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

  const preloadEntry = createDesktopPreloadOptionalRuntimeCall(runtimeLike, globalThis);
  const executorEntry = createDesktopExecutorOptionalRuntimeCall(runtimeLike, globalThis);

  const preloadResult = preloadEntry.invoke();
  const executorResult = executorEntry.invoke();

  return {
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
  const result = verifyDesktopRuntimeLikeIntegration();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
