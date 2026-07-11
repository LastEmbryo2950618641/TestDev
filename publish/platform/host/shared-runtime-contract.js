// Shared host runtime contract draft
// Keeps cross-platform shell alignment in one neutral place without leaking Electron/WebView specifics.

export function createSharedHostRuntimeContractShape() {
  return {
    runtimeFamily: 'host-shell',
    stage: 'shared-host-runtime-contract-shape',
    fields: {
      runtime: 'platform runtime id',
      hostKind: 'desktop | mobile | future-host',
      shellLocalOnly: 'boolean',
      publishTouched: 'boolean',
      lifecycle: {
        boot: 'string[]',
        attach: 'string[]',
        load: 'string[]',
        teardown: 'string[]',
      },
      view: {
        id: 'string',
        title: 'string',
        containerKind: 'string',
      },
      renderer: {
        entry: 'string',
        loadStrategy: 'string',
      },
      bridge: {
        namespace: 'string',
        assemblyReady: 'boolean',
      },
      mapper: {
        readyHook: 'string',
        attachApi: 'string',
        loadApi: 'string',
        focusApi: 'string',
        reloadApi: 'string',
        closeApi: 'string',
      },
      checkpoints: 'record<string, boolean>',
    },
  };
}

export function createSharedHostRuntimeContract(input = {}) {
  const lifecycle = input.lifecycle || {};
  const view = input.view || {};
  const renderer = input.renderer || {};
  const bridge = input.bridge || {};
  const mapper = input.mapper || {};
  const checkpoints = input.checkpoints || {};

  return {
    runtimeFamily: 'host-shell',
    stage: 'shared-host-runtime-contract',
    runtime: String(input.runtime || ''),
    hostKind: String(input.hostKind || ''),
    shellLocalOnly: input.shellLocalOnly === true,
    publishTouched: input.publishTouched === true,
    lifecycle: {
      boot: Array.isArray(lifecycle.boot) ? lifecycle.boot : [],
      attach: Array.isArray(lifecycle.attach) ? lifecycle.attach : [],
      load: Array.isArray(lifecycle.load) ? lifecycle.load : [],
      teardown: Array.isArray(lifecycle.teardown) ? lifecycle.teardown : [],
    },
    view: {
      id: String(view.id || ''),
      title: String(view.title || ''),
      containerKind: String(view.containerKind || ''),
    },
    renderer: {
      entry: String(renderer.entry || ''),
      loadStrategy: String(renderer.loadStrategy || ''),
    },
    bridge: {
      namespace: String(bridge.namespace || ''),
      assemblyReady: bridge.assemblyReady === true,
    },
    mapper: {
      readyHook: String(mapper.readyHook || ''),
      attachApi: String(mapper.attachApi || ''),
      loadApi: String(mapper.loadApi || ''),
      focusApi: String(mapper.focusApi || ''),
      reloadApi: String(mapper.reloadApi || ''),
      closeApi: String(mapper.closeApi || ''),
    },
    checkpoints,
    ready: Object.values(checkpoints).every(Boolean),
  };
}
