import { pathToFileURL } from 'node:url';
import {
  bootstrapElectronRuntime,
  createElectronGuardedBootstrapPlan,
  createElectronRuntimeBranch,
  createElectronRuntimeOptionalRealCall,
  createElectronRuntimeSkeleton,
} from './electron-main.js';
import { createElectronPreloadOptionalRealCall, createElectronPreloadRuntimeSkeleton } from './electron-preload.js';
import { createOptionalElectronApiAdapter } from './electron-api-adapter.js';

export async function verifyElectronShellSkeleton() {
  const adapter = await createOptionalElectronApiAdapter();
  const mainSkeleton = createElectronRuntimeSkeleton();
  const preloadSkeleton = createElectronPreloadRuntimeSkeleton();
  const mainRealCall = await createElectronRuntimeOptionalRealCall();
  const preloadRealCall = await createElectronPreloadOptionalRealCall();
  const guardedBootstrap = await createElectronGuardedBootstrapPlan();
  const disabledBranch = await createElectronRuntimeBranch({ enabled: false });
  const enabledBranch = await createElectronRuntimeBranch({ enabled: true });
  const bootstrap = await bootstrapElectronRuntime();

  return {
    adapter,
    mainSkeleton,
    preloadSkeleton,
    mainRealCall,
    preloadRealCall,
    guardedBootstrap,
    disabledBranch,
    enabledBranch,
    bootstrap,
    checks: {
      preloadPathReady: Boolean(mainSkeleton.paths?.preloadPath),
      rendererEntryReady: Boolean(mainSkeleton.paths?.rendererEntry),
      exposeNamespaceReady: Boolean(preloadSkeleton.namespace),
      contractReady: bootstrap.contractReady === true,
      optionalAdapterKnown: typeof adapter.available === 'boolean',
      guardedBootstrapPresent: Array.isArray(guardedBootstrap.steps),
      runtimeBranchPresent: Array.isArray(disabledBranch.steps) && Array.isArray(enabledBranch.steps),
    },
  };
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const result = await verifyElectronShellSkeleton();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
