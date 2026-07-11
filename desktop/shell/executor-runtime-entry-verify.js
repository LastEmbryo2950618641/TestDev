// Desktop executor runtime entry verification draft
import { createDesktopExecutorOptionalRuntimeCall } from './executor-runtime-entry.js';

export function verifyDesktopExecutorRuntimeEntry() {
  const withoutRuntime = createDesktopExecutorOptionalRuntimeCall({}, globalThis);

  const calls = [];
  const runtimeLike = {
    createWindow(options) {
      calls.push({ type: 'createWindow', options });
      return { ok: true, options };
    },
    loadRenderer(entry) {
      calls.push({ type: 'loadRenderer', entry });
      return { ok: true, entry };
    },
  };

  const withRuntime = createDesktopExecutorOptionalRuntimeCall(runtimeLike, globalThis);
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
  const result = verifyDesktopExecutorRuntimeEntry();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
