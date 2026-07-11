import { createSharedKeysCapabilityContract } from '../../publish/platform/keys/shared-capability-contract.js';
import { desktopKeysBridge } from './bridge/keys.js';

export function createDesktopSharedKeysCapabilityContract(target = globalThis) {
  const capabilities = desktopKeysBridge.capabilities(target);
  const methods = ['readDeepseekKey', 'readPixaiKey'];

  return createSharedKeysCapabilityContract({
    hostKind: 'desktop',
    shellLocalOnly: true,
    publishTouched: false,
    channel: capabilities.channel || desktopKeysBridge.channel(target),
    providerSources: capabilities.providerSources || desktopKeysBridge.providerSources(),
    capabilities,
    methods,
    fallback: {
      browserCore: 'window.GameModules.platform.core.keys',
    },
    checkpoints: {
      capabilityShapeReady: typeof capabilities.ready === 'boolean',
      methodsReady: methods.length === 2,
      fallbackReady: true,
    },
  });
}
