import { createSharedAssetsCapabilityContract } from './assets-shared-capability-contract.js';

function createBrowserAssetsCapabilities(target = globalThis) {
  const source = target?.GameModules?.platform?.core?.assets?.bodyFigure || target?.window?.GameModules?.platform?.core?.assets?.bodyFigure;
  return {
    ready: Boolean(source),
    canLoadIndex: typeof source?.loadIndex === 'function',
    canSaveMeta: typeof source?.saveMeta === 'function',
    canSaveImage: typeof source?.saveImage === 'function',
  };
}

export function createBrowserSharedAssetsCapabilityContract(target = globalThis) {
  const capabilities = createBrowserAssetsCapabilities(target);
  const methods = ['loadIndex', 'saveMeta', 'saveImage'];

  return createSharedAssetsCapabilityContract({
    hostKind: 'browser',
    shellLocalOnly: false,
    publishTouched: true,
    channel: 'browser-assets',
    assetBasePath: 'assets/body-figures',
    capabilities,
    methods,
    fallback: {
      browserCore: 'window.GameModules.platform.core.assets.bodyFigure',
    },
    checkpoints: {
      capabilityShapeReady: typeof capabilities.ready === 'boolean',
      methodsReady: methods.length === 3,
      fallbackReady: true,
    },
  });
}
