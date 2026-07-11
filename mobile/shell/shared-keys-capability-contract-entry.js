import { createSharedKeysCapabilityContract } from '../../publish/platform/keys/shared-capability-contract.js';
import { mobileKeysBridge } from './bridge/keys.js';

function createMobileKeysCapabilities() {
  return {
    ready: false,
    canReadDeepseekKey: false,
    canReadPixaiKey: false,
  };
}

function createMobileProviderSources() {
  return {
    deepseek: ['mobileSecureStore'],
    pixai: ['mobileSecureStore'],
  };
}

export function createMobileSharedKeysCapabilityContract() {
  const capabilities = createMobileKeysCapabilities();
  const methods = Object.keys(mobileKeysBridge).filter((key) => typeof mobileKeysBridge[key] === 'function');

  return createSharedKeysCapabilityContract({
    hostKind: 'mobile',
    shellLocalOnly: true,
    publishTouched: false,
    channel: 'mobile-keys-bridge',
    providerSources: createMobileProviderSources(),
    capabilities,
    methods,
    fallback: {
      browserCore: 'window.GameModules.platform.core.keys',
    },
    checkpoints: {
      capabilityShapeReady: typeof capabilities.ready === 'boolean',
      methodsReady: methods.length >= 2,
      fallbackReady: true,
    },
  });
}
