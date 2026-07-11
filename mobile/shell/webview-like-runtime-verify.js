// Mobile webview-like runtime verification draft
import { createMobileOptionalRuntimeCall } from './runtime-entry.js';
import { createMobileHostRunnerDraft } from './host-runner.js';

export function verifyMobileWebViewLikeRuntime() {
  const calls = [];

  const webviewLikeRuntime = {
    lifecycle: {
      ready: false,
    },
    onReady() {
      this.lifecycle.ready = true;
      calls.push({ type: 'onReady' });
      return { ok: true };
    },
    attachWebView(windowConfig) {
      calls.push({ type: 'attachWebView', windowConfig });
      return { ok: true, windowConfig };
    },
    loadRenderer(entry) {
      calls.push({ type: 'loadRenderer', entry });
      return { ok: true, entry };
    },
  };

  const runtimeEntry = createMobileOptionalRuntimeCall(webviewLikeRuntime, globalThis);
  const runner = createMobileHostRunnerDraft(globalThis);

  const readyResult = webviewLikeRuntime.onReady();
  const invokeResult = runtimeEntry.invoke();

  return {
    lifecycle: webviewLikeRuntime.lifecycle,
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
    calls,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifyMobileWebViewLikeRuntime();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
