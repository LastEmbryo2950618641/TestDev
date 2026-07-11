import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runElectronPreloadExpose, createElectronPreloadExposeExecutionPlan } from './electron-preload.js';

export async function verifyElectronPreloadExposeExecution() {
  const calls = [];
  const runtimeLike = {
    exposeInMainWorld(namespace, payload) {
      calls.push({ namespace, payload });
      return { ok: true, namespace, hasStorage: Boolean(payload?.storage) };
    },
  };

  const options = {
    baseDir: path.resolve(process.cwd(), 'desktop', 'shell', '.preload-expose-verify-storage'),
  };

  const withoutRuntime = runElectronPreloadExpose({}, globalThis, options);
  const withRuntime = runElectronPreloadExpose(runtimeLike, globalThis, options);
  const plan = createElectronPreloadExposeExecutionPlan(globalThis, options);

  return {
    withoutRuntime,
    withRuntime,
    plan: {
      namespace: plan.namespace,
      exposeApi: plan.exposeApi,
      hasStorage: Boolean(plan.payload?.storage),
      storageRoot: plan.payload?.storage?.root || null,
    },
    calls,
  };
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const result = await verifyElectronPreloadExposeExecution();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
