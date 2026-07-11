// Shared host capability contract draft
// Normalizes host capability reporting across browser, desktop, and mobile shells.

export function createSharedHostCapabilityContractShape() {
  return {
    runtimeFamily: 'host-capability-shell',
    stage: 'shared-host-capability-contract-shape',
    fields: {
      hostKind: 'browser | desktop | mobile | future-host',
      shellLocalOnly: 'boolean',
      publishTouched: 'boolean',
      environment: {
        isDesktop: 'boolean',
        isMobile: 'boolean',
        isDev: 'boolean',
      },
      bridge: {
        ready: 'boolean',
        preferred: 'string',
        channels: 'record<string, boolean>',
      },
      features: {
        files: 'boolean',
        storage: 'boolean',
        windowing: 'boolean',
        webview: 'boolean',
        notifications: 'boolean',
        permissions: 'boolean',
      },
      fallback: {
        browserCore: 'string',
      },
      checkpoints: 'record<string, boolean>',
    },
  };
}

export function createSharedHostCapabilityContract(input = {}) {
  const environment = input.environment || {};
  const bridge = input.bridge || {};
  const features = input.features || {};
  const fallback = input.fallback || {};
  const checkpoints = input.checkpoints || {};

  return {
    runtimeFamily: 'host-capability-shell',
    stage: 'shared-host-capability-contract',
    hostKind: String(input.hostKind || ''),
    shellLocalOnly: input.shellLocalOnly === true,
    publishTouched: input.publishTouched === true,
    environment: {
      isDesktop: environment.isDesktop === true,
      isMobile: environment.isMobile === true,
      isDev: environment.isDev === true,
    },
    bridge: {
      ready: bridge.ready === true,
      preferred: String(bridge.preferred || ''),
      channels: bridge.channels || {},
    },
    features: {
      files: features.files === true,
      storage: features.storage === true,
      windowing: features.windowing === true,
      webview: features.webview === true,
      notifications: features.notifications === true,
      permissions: features.permissions === true,
    },
    fallback: {
      browserCore: String(fallback.browserCore || ''),
    },
    checkpoints,
    ready: Object.values(checkpoints).every(Boolean),
  };
}
