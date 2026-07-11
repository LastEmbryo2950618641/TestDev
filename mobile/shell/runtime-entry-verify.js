// Mobile runtime entry verification draft
import { createMobileOptionalRuntimeCall } from './runtime-entry.js';

export function verifyMobileRuntimeEntry() {
  const withoutRuntime = createMobileOptionalRuntimeCall({}, globalThis);

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

  const withRuntime = createMobileOptionalRuntimeCall(runtimeLike, globalThis);
  const invoked = withRuntime.invoke();

  return {
    withoutRuntime: {
      canInvoke: withoutRuntime.canInvoke,
      result: withoutRuntime.invoke(),
    },
    withRuntime: {
      canInvoke: withRuntime.canInvoke,
      result: invoked,
      calls,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = verifyMobileRuntimeEntry();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
