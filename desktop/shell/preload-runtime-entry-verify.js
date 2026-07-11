// Desktop preload runtime entry verification draft
import { createDesktopPreloadOptionalRuntimeCall } from './preload-runtime-entry.js';

export function verifyDesktopPreloadRuntimeEntry() {
  const withoutRuntime = createDesktopPreloadOptionalRuntimeCall({}, globalThis);

  const calls = [];
  const runtimeLike = {
    exposeInMainWorld(namespace, payload) {
      calls.push({ namespace, payload });
      return { ok: true, namespace };
    },
  };

  const withRuntime = createDesktopPreloadOptionalRuntimeCall(runtimeLike, globalThis);
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
  const result = verifyDesktopPreloadRuntimeEntry();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
