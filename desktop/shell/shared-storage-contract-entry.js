import { createSharedStorageRuntimeContract } from '../../publish/platform/storage/shared-runtime-contract.js';
import { desktopStorageBridge } from './bridge/storage.js';

export function createDesktopSharedStorageRuntimeContract(target = globalThis) {
  const capabilities = desktopStorageBridge.capabilities(target);
  const sources = desktopStorageBridge.sourceShape();
  const channel = desktopStorageBridge.channel(target);

  return createSharedStorageRuntimeContract({
    hostKind: 'desktop',
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
