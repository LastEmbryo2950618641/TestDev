// Shared keys capability contract draft
// Normalizes cross-platform provider key capability reporting while preserving host-local implementations.

export function createSharedKeysCapabilityContractShape() {
  return {
    runtimeFamily: 'keys-shell',
    stage: 'shared-keys-capability-contract-shape',
    fields: {
      hostKind: 'desktop | mobile | browser | future-host',
      shellLocalOnly: 'boolean',
      publishTouched: 'boolean',
      channel: 'string',
      providerSources: 'record<string, string[]>',
      capabilities: {
        ready: 'boolean',
        canReadDeepseekKey: 'boolean',
        canReadPixaiKey: 'boolean',
      },
      methods: 'string[]',
      fallback: {
        browserCore: 'string',
      },
      checkpoints: 'record<string, boolean>',
    },
  };
}

export function createSharedKeysCapabilityContract(input = {}) {
  const capabilities = input.capabilities || {};
  const checkpoints = input.checkpoints || {};

  return {
    runtimeFamily: 'keys-shell',
    stage: 'shared-keys-capability-contract',
    hostKind: String(input.hostKind || ''),
    shellLocalOnly: input.shellLocalOnly === true,
    publishTouched: input.publishTouched === true,
    channel: String(input.channel || ''),
    providerSources: input.providerSources || {},
    capabilities: {
      ready: capabilities.ready === true,
      canReadDeepseekKey: capabilities.canReadDeepseekKey === true,
      canReadPixaiKey: capabilities.canReadPixaiKey === true,
    },
    methods: Array.isArray(input.methods) ? input.methods : [],
    fallback: {
      browserCore: String(input.fallback?.browserCore || ''),
    },
    checkpoints,
    ready: Object.values(checkpoints).every(Boolean),
  };
}
