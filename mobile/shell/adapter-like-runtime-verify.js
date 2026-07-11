// Mobile adapter-like runtime verification draft
import { createMobileOptionalRuntimeCall } from './runtime-entry.js';
import { createMobileHostRunnerDraft } from './host-runner.js';

function createWebViewLikeAdapter() {
  const calls = [];
  const state = {
    ready: false,
    webviewAttached: false,
    rendererLoaded: false,
  };

  return {
    calls,
    state,
    lifecycle: {
      onReady() {
        state.ready = true;
        calls.push({ type: 'onReady' });
        return { ok: true };
      },
    },
    webviewBridge: {
      attachWebView(windowConfig) {
        state.webviewAttached = true;
        calls.push({ type: 'attachWebView', windowConfig });
        return { ok: true, windowConfig };
      },
    },
    rendererBridge: {
      loadRenderer(entry) {
        state.rendererLoaded = true;
        calls.push({ type: 'loadRenderer', entry });
        return { ok: true, entry };
      },
    },
  };
}

export function verifyMobileAdapterLikeRuntime() {
  const adapter = createWebViewLikeAdapter();
  const runtimeLike = {
    attachWebView: adapter.webviewBridge.attachWebView,
    loadRenderer: adapter.rendererBridge.loadRenderer,
  };

  const runtimeEntry = createMobileOptionalRuntimeCall(runtimeLike, globalThis);
  const runner = createMobileHostRunnerDraft(globalThis);

  const readyResult = adapter.lifecycle.onReady();
  const invokeResult = runtimeEntry.invoke();

  return {
    state: adapter.state,
    readyResult,
    runtimeEntry: {
      canInvoke: runtimeEntry.canInvoke,
      result: invokeResult,
    },
    runner: {
      runtime: runner.runtime,
      ready: runner.ready,
      exposeNamespace: runner.pipeline?.renderer?.exposeNamespace || '',
      rendererEntry: runner.pipeline?.renderer?.entry || '',
      loadStrategy: runner.pipeline?.renderer?.strategy || '',
    },
    calls: adapter.calls,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifyMobileAdapterLikeRuntime();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
