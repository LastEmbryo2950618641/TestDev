import { createSharedFilesCapabilityContract } from '../../publish/platform/files/shared-capability-contract.js';
import { mobileFilesBridge } from './bridge/files.js';

function createMobileFilesCapabilities() {
  return {
    ready: false,
    canPickFile: false,
    canSaveFile: false,
    canReadText: false,
    canWriteText: false,
    canReadJson: false,
    canWriteJson: false,
  };
}

export function createMobileSharedFilesCapabilityContract() {
  const capabilities = createMobileFilesCapabilities();
  const methods = Object.keys(mobileFilesBridge).filter((key) => typeof mobileFilesBridge[key] === 'function');

  return createSharedFilesCapabilityContract({
    hostKind: 'mobile',
    shellLocalOnly: true,
    publishTouched: false,
    channel: 'mobile-files-bridge',
    capabilities,
    methods,
    fallback: {
      browserCore: 'window.GameModules.platform.core.files',
    },
    checkpoints: {
      capabilityShapeReady: typeof capabilities.ready === 'boolean',
      methodsReady: methods.length >= 6,
      fallbackReady: true,
    },
  });
}
