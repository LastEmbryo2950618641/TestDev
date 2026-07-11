// Shared assets capability contract draft
// Normalizes cross-platform asset capability reporting while preserving host-local implementations.

export function createSharedAssetsCapabilityContractShape() {
  return {
    runtimeFamily: 'assets-shell',
    stage: 'shared-assets-capability-contract-shape',
    fields: {
      hostKind: 'desktop | mobile | browser | future-host',
      shellLocalOnly: 'boolean',
      publishTouched: 'boolean',
      channel: 'string',
      assetBasePath: 'string',
      capabilities: {
        ready: 'boolean',
        canLoadIndex: 'boolean',
        canSaveMeta: 'boolean',
        canSaveImage: 'boolean',
      },
      methods: 'string[]',
      fallback: {
        browserCore: 'string',
      },
      checkpoints: 'record<string, boolean>',
    },
  };
}

export function createSharedAssetsCapabilityContract(input = {}) {
  const capabilities = input.capabilities || {};
  const checkpoints = input.checkpoints || {};

  return {
    runtimeFamily: 'assets-shell',
    stage: 'shared-assets-capability-contract',
    hostKind: String(input.hostKind || ''),
    shellLocalOnly: input.shellLocalOnly === true,
    publishTouched: input.publishTouched === true,
    channel: String(input.channel || ''),
    assetBasePath: String(input.assetBasePath || ''),
    capabilities: {
      ready: capabilities.ready === true,
      canLoadIndex: capabilities.canLoadIndex === true,
      canSaveMeta: capabilities.canSaveMeta === true,
      canSaveImage: capabilities.canSaveImage === true,
    },
    methods: Array.isArray(input.methods) ? input.methods : [],
    fallback: {
      browserCore: String(input.fallback?.browserCore || ''),
    },
    checkpoints,
    ready: Object.values(checkpoints).every(Boolean),
  };
}
