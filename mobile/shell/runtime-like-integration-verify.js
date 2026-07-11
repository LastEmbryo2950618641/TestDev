// Mobile runtime-like integration verification draft
import { createMobileOptionalRuntimeCall } from './runtime-entry.js';
import { createMobileHostRunnerDraft } from './host-runner.js';

export function verifyMobileRuntimeLikeIntegration() {
  const calls = [];

  const runtimeLike = {
    attachWebView(windowConfig) {
      calls.push({ type: 'attachWebView', windowConfig });
      return { ok: true, windowConfig };
    },
    loadRenderer(entry) {
      calls.push({ type: 'loadRenderer', entry });
      return { ok: true, entry };
    },
  };

  const runtimeEntry = createMobileOptionalRuntimeCall(runtimeLike, globalThis);
  const runner = createMobileHostRunnerDraft(globalThis);
  const invoked = runtimeEntry.invoke();

  return {
    runtimeEntry: {
      canInvoke: runtimeEntry.canInvoke,
      result: invoked,
    },
    runner: {
      runtime: runner.runtime,
      ready: runner.ready,
      exposeNamespace: runner.pipeline?.renderer?.exposeNamespace || '',
      rendererEntry: runner.pipeline?.renderer?.entry || '',
    },
    calls,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifyMobileRuntimeLikeIntegration();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
