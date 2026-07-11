import { createSharedStorageRuntimeContract } from '../../publish/platform/storage/shared-runtime-contract.js';
import { mobileStorageBridge } from './bridge/storage.js';
import { attachMobilePlatformCore } from './assembly-entry.js';

function createStorageContractTarget() {
  const target = {
    navigator: { userAgent: 'Android Shared Storage Contract' },
    GameModules: {},
  };
  target.window = target;
  attachMobilePlatformCore(target, {
    baseDir: `${process.cwd()}\\mobile\\shell\\.shared-storage-contract`,
  });
  return target;
}

export function createMobileSharedStorageRuntimeContract(target = createStorageContractTarget()) {
  const capabilities = mobileStorageBridge.capabilities(target);
  const sources = mobileStorageBridge.sourceShape();
  const channel = mobileStorageBridge.channel(target);

  return createSharedStorageRuntimeContract({
    hostKind: 'mobile',
    shellLocalOnly: true,
    publishTouched: false,
    channel,
    capabilities,
    sources,
    fallback: {
      browserCore: 'window.GameModules.platform.core.storage.localSettingsSource',
    },
    checkpoints: {
      sourceShapeReady: Array.isArray(sources.raw) && Array.isArray(sources.settings),
      capabilitiesReady: typeof capabilities.ready === 'boolean',
      fallbackReady: true,
    },
  });
}
