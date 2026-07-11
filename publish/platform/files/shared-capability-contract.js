// Shared files capability contract draft
// Normalizes cross-platform file capability reporting while keeping implementation local to each shell.

export function createSharedFilesCapabilityContractShape() {
  return {
    runtimeFamily: 'files-shell',
    stage: 'shared-files-capability-contract-shape',
    fields: {
      hostKind: 'desktop | mobile | browser | future-host',
      shellLocalOnly: 'boolean',
      publishTouched: 'boolean',
      channel: 'string',
      capabilities: {
        ready: 'boolean',
        canPickFile: 'boolean',
        canSaveFile: 'boolean',
        canReadText: 'boolean',
        canWriteText: 'boolean',
        canReadJson: 'boolean',
        canWriteJson: 'boolean',
      },
      methods: 'string[]',
      fallback: {
        browserCore: 'string',
      },
      checkpoints: 'record<string, boolean>',
    },
  };
}

export function createSharedFilesCapabilityContract(input = {}) {
  const capabilities = input.capabilities || {};
  const checkpoints = input.checkpoints || {};

  return {
    runtimeFamily: 'files-shell',
    stage: 'shared-files-capability-contract',
    hostKind: String(input.hostKind || ''),
    shellLocalOnly: input.shellLocalOnly === true,
    publishTouched: input.publishTouched === true,
    channel: String(input.channel || ''),
    capabilities: {
      ready: capabilities.ready === true,
      canPickFile: capabilities.canPickFile === true,
      canSaveFile: capabilities.canSaveFile === true,
      canReadText: capabilities.canReadText === true,
      canWriteText: capabilities.canWriteText === true,
      canReadJson: capabilities.canReadJson === true,
      canWriteJson: capabilities.canWriteJson === true,
    },
    methods: Array.isArray(input.methods) ? input.methods : [],
    fallback: {
      browserCore: String(input.fallback?.browserCore || ''),
    },
    checkpoints,
    ready: Object.values(checkpoints).every(Boolean),
  };
}
