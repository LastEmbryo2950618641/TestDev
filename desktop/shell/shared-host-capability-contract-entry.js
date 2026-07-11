import { createSharedHostCapabilityContract } from '../../publish/platform/host/shared-capability-contract.js';
import { desktopHostBridge } from './bridge/host.js';

export function createDesktopSharedHostCapabilityContract(target = globalThis) {
  const capabilities = desktopHostBridge.capabilities(target);
  const bridge = desktopHostBridge.bridgeStatus(target);

  return createSharedHostCapabilityContract({
    hostKind: desktopHostBridge.kind(),
    shellLocalOnly: true,
    publishTouched: false,
    environment: {
      isDesktop: capabilities.isDesktop,
      isMobile: capabilities.isMobile,
      isDev: capabilities.isDev,
    },
    bridge: {
      ready: capabilities.bridgeReady,
      preferred: capabilities.preferredBridge,
      channels: capabilities.bridgeChannels,
    },
    features: {
      files: capabilities.files,
      storage: capabilities.storage,
      windowing: capabilities.windowing,
      webview: false,
      notifications: capabilities.notifications,
      permissions: false,
    },
    fallback: {
      browserCore: 'window.GameModules.platform.core.host',
    },
    checkpoints: {
      bridgeShapeReady: typeof bridge.ready === 'boolean',
      featureShapeReady: typeof capabilities.files === 'boolean',
      fallbackReady: true,
    },
  });
}
