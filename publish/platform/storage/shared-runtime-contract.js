// Shared storage runtime contract draft
// Normalizes cross-platform storage capability reporting without moving platform implementation into gameplay modules.

export function createSharedStorageRuntimeContractShape() {
  return {
    runtimeFamily: 'storage-shell',
    stage: 'shared-storage-runtime-contract-shape',
    fields: {
      hostKind: 'desktop | mobile | browser | future-host',
      shellLocalOnly: 'boolean',
      publishTouched: 'boolean',
      channel: 'string',
      capabilities: {
        ready: 'boolean',
        canReadRaw: 'boolean',
        canWriteRaw: 'boolean',
        canRemoveRaw: 'boolean',
        canReadSettings: 'boolean',
        canWriteSettings: 'boolean',
      },
      sources: {
        raw: 'string[]',
        settings: 'string[]',
      },
      fallback: {
        browserCore: 'string',
      },
      checkpoints: 'record<string, boolean>',
    },
  };
}

export function createSharedStorageRuntimeContract(input = {}) {
  const capabilities = input.capabilities || {};
  const sources = input.sources || {};
  const fallback = input.fallback || {};
  const checkpoints = input.checkpoints || {};

  return {
    runtimeFamily: 'storage-shell',
    stage: 'shared-storage-runtime-contract',
    hostKind: String(input.hostKind || ''),
    shellLocalOnly: input.shellLocalOnly === true,
    publishTouched: input.publishTouched === true,
    channel: String(input.channel || ''),
    capabilities: {
      ready: capabilities.ready === true,
      canReadRaw: capabilities.canReadRaw === true,
      canWriteRaw: capabilities.canWriteRaw === true,
      canRemoveRaw: capabilities.canRemoveRaw === true,
      canReadSettings: capabilities.canReadSettings === true,
      canWriteSettings: capabilities.canWriteSettings === true,
    },
    sources: {
      raw: Array.isArray(sources.raw) ? sources.raw : [],
      settings: Array.isArray(sources.settings) ? sources.settings : [],
    },
    fallback: {
      browserCore: String(fallback.browserCore || ''),
    },
    checkpoints,
    ready: Object.values(checkpoints).every(Boolean),
  };
}
