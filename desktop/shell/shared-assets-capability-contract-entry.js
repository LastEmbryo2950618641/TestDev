import { createSharedAssetsCapabilityContract } from '../../publish/platform/assets-shared-capability-contract.js';
import { desktopAssetsBridge } from './bridge/assets.js';

export function createDesktopSharedAssetsCapabilityContract(target = globalThis) {
  const capabilities = desktopAssetsBridge.capabilities(target);
  const methods = ['loadIndex', 'saveMeta', 'saveImage'];

  return createSharedAssetsCapabilityContract({
    hostKind: 'desktop',
    shellLocalOnly: true,
    publishTouched: false,
    channel: capabilities.channel || desktopAssetsBridge.channel(target),
    assetBasePath: desktopAssetsBridge.bodyFigureRoot(),
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
