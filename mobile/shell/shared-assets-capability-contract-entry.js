import { createSharedAssetsCapabilityContract } from '../../publish/platform/assets-shared-capability-contract.js';
import { mobileAssetsBridge } from './bridge/assets.js';

function createMobileAssetsCapabilities() {
  return {
    ready: false,
    canLoadIndex: false,
    canSaveMeta: false,
    canSaveImage: false,
  };
}

export function createMobileSharedAssetsCapabilityContract() {
  const capabilities = createMobileAssetsCapabilities();
  const methods = Object.keys(mobileAssetsBridge).filter((key) => typeof mobileAssetsBridge[key] === 'function');

  return createSharedAssetsCapabilityContract({
    hostKind: 'mobile',
    shellLocalOnly: true,
    publishTouched: false,
    channel: 'mobile-assets-bridge',
    assetBasePath: mobileAssetsBridge.assetBasePath(''),
    capabilities,
    methods,
    fallback: {
      browserCore: 'window.GameModules.platform.core.assets.bodyFigure',
    },
    checkpoints: {
      capabilityShapeReady: typeof capabilities.ready === 'boolean',
      methodsReady: methods.length >= 4,
      fallbackReady: true,
    },
  });
}
