import { createSharedHostCapabilityContract } from '../../publish/platform/host/shared-capability-contract.js';
import { mobileHostBridge } from './bridge/host.js';

export function createMobileSharedHostCapabilityContract() {
  const capabilities = mobileHostBridge.capabilities();

  return createSharedHostCapabilityContract({
    hostKind: mobileHostBridge.kind(),
    shellLocalOnly: true,
    publishTouched: false,
    environment: {
      isDesktop: mobileHostBridge.isDesktop(),
      isMobile: mobileHostBridge.isMobile(),
      isDev: mobileHostBridge.isDev(),
    },
    bridge: {
      ready: true,
      preferred: 'mobile-bridge',
      channels: { mobileBridge: true },
    },
    features: {
      files: capabilities.files === true,
      storage: capabilities.storage === true,
      windowing: false,
      webview: capabilities.webview === true,
      notifications: false,
      permissions: capabilities.permissions === true,
    },
    fallback: {
      browserCore: 'window.GameModules.platform.core.host',
    },
    checkpoints: {
      bridgeShapeReady: true,
      featureShapeReady: typeof capabilities.storage === 'boolean',
      fallbackReady: true,
    },
  });
}
