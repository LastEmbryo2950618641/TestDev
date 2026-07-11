import { createSharedFilesCapabilityContract } from '../../publish/platform/files/shared-capability-contract.js';
import { desktopFilesBridge } from './bridge/files.js';

export function createDesktopSharedFilesCapabilityContract(target = globalThis) {
  const capabilities = desktopFilesBridge.capabilities(target);
  const methods = ['readText', 'writeText', 'readJson', 'writeJson', 'pickFile', 'saveFile'];

  return createSharedFilesCapabilityContract({
    hostKind: 'desktop',
    shellLocalOnly: true,
    publishTouched: false,
    channel: capabilities.channel || desktopFilesBridge.channel(target),
    capabilities,
    methods,
    fallback: {
      browserCore: 'window.GameModules.platform.core.files',
    },
    checkpoints: {
      capabilityShapeReady: typeof capabilities.ready === 'boolean',
      methodsReady: methods.length === 6,
      fallbackReady: true,
    },
  });
}
