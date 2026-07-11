import { createSharedKeysCapabilityContract } from './keys/shared-capability-contract.js';

function createBrowserKeysCapabilities(target = globalThis) {
  const source = target?.GameModules?.platform?.core?.keys || target?.window?.GameModules?.platform?.core?.keys;
  return {
    ready: Boolean(source),
    canReadDeepseekKey: typeof source?.readDeepseekKey === 'function',
    canReadPixaiKey: typeof source?.readPixaiKey === 'function',
  };
}

export function createBrowserSharedKeysCapabilityContract(target = globalThis) {
  const capabilities = createBrowserKeysCapabilities(target);
  const methods = ['readDeepseekKey', 'readPixaiKey'];

  return createSharedKeysCapabilityContract({
    hostKind: 'browser',
    shellLocalOnly: false,
    publishTouched: true,
    channel: 'browser-keys',
    providerSources: {
      deepseek: ['browser-memory-or-input'],
      pixai: ['browser-memory-or-input'],
    },
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
