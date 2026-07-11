// Mobile host runner draft
import {
  createMobileRuntimeAdapterDraft,
  createMobileRuntimeHostActionContract,
} from './runtime-adapter.js';

function createMobileHostRunnerSteps(adapter) {
  return [
    {
      key: 'app-ready',
      type: 'app',
      hook: adapter.app?.readyHook || '',
      actions: adapter.app?.bootActions || [],
      lifecycle: adapter.app?.lifecycle || {},
    },
    {
      key: 'attach-webview',
      type: 'webview',
      factory: adapter.webview?.factory || '',
      actions: adapter.webview?.createActions || [],
      window: adapter.webview?.window || null,
      events: adapter.webview?.events || {},
    },
    {
      key: 'attach-platform-bridge',
      type: 'renderer',
      namespace: adapter.renderer?.exposeNamespace || '',
      channels: adapter.renderer?.channels || {},
    },
    {
      key: 'load-renderer-entry',
      type: 'renderer',
      strategy: adapter.renderer?.strategy || '',
      entry: adapter.renderer?.entry || '',
      actions: adapter.renderer?.loadActions || [],
      loadContract: adapter.renderer?.loadContract || {},
    },
    {
      key: 'register-shutdown-hooks',
      type: 'app',
      hooks: adapter.app?.shutdownHooks || [],
      lifecycle: adapter.app?.lifecycle || {},
    },
  ];
}

function createMobileHostRunnerPipeline(adapter) {
  return {
    app: {
      readyHook: adapter.app?.readyHook || '',
      lifecycle: adapter.app?.lifecycle || {},
      bootActions: adapter.app?.bootActions || [],
      shutdownHooks: adapter.app?.shutdownHooks || [],
    },
    webview: {
      factory: adapter.webview?.factory || '',
      createActions: adapter.webview?.createActions || [],
      window: adapter.webview?.window || null,
      events: adapter.webview?.events || {},
    },
    renderer: {
      strategy: adapter.renderer?.strategy || '',
      entry: adapter.renderer?.entry || '',
      exposeNamespace: adapter.renderer?.exposeNamespace || '',
      channels: adapter.renderer?.channels || {},
      loadContract: adapter.renderer?.loadContract || {},
    },
  };
}

export function createMobileHostRunnerDraft(target = globalThis) {
  const adapter = createMobileRuntimeAdapterDraft(target);
  return {
    runtime: adapter.runtime,
    stage: 'mobile-host-runner-draft',
    ready: adapter.ready === true,
    steps: createMobileHostRunnerSteps(adapter),
    pipeline: createMobileHostRunnerPipeline(adapter),
    assembly: adapter.assembly || null,
    contract: createMobileRuntimeHostActionContract(target),
  };
}

export function runMobileHostMockExecution(target = globalThis) {
  const runner = createMobileHostRunnerDraft(target);
  return {
    runtime: runner.runtime,
    stage: 'mobile-host-mock-execution',
    ready: runner.ready,
    completedSteps: runner.steps.map((step, index) => ({
      index: index + 1,
      key: step.key,
      simulated: true,
    })),
    exposeNamespace: runner.pipeline?.renderer?.exposeNamespace || '',
    rendererEntry: runner.pipeline?.renderer?.entry || '',
    loadStrategy: runner.pipeline?.renderer?.strategy || '',
  };
}
