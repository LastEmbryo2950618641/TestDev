// Desktop host runner draft
import {
  createDesktopRuntimeAdapterDraft,
  createDesktopRuntimeAdapterChecklist,
  createDesktopRuntimeHostActionContract,
} from './runtime-adapter.js';

function createHostRunnerSteps(adapter) {
  return [
    {
      key: 'app-ready',
      type: 'app',
      hook: adapter.app?.readyHook || '',
      actions: adapter.app?.bootActions || [],
      lifecycle: adapter.app?.lifecycle || {},
    },
    {
      key: 'create-window',
      type: 'window',
      factory: adapter.window?.factory || '',
      actions: adapter.window?.createActions || [],
      options: adapter.window?.options || {},
      events: adapter.window?.events || {},
    },
    {
      key: 'attach-preload-bridge',
      type: 'renderer',
      namespace: adapter.renderer?.exposeNamespace || '',
      preloadPath: adapter.renderer?.preloadPath || '',
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

function createHostRunnerPipeline(adapter) {
  return {
    app: {
      readyHook: adapter.app?.readyHook || '',
      lifecycle: adapter.app?.lifecycle || {},
      bootActions: adapter.app?.bootActions || [],
      shutdownHooks: adapter.app?.shutdownHooks || [],
    },
    window: {
      factory: adapter.window?.factory || '',
      createActions: adapter.window?.createActions || [],
      options: adapter.window?.options || {},
      events: adapter.window?.events || {},
    },
    renderer: {
      strategy: adapter.renderer?.strategy || '',
      entry: adapter.renderer?.entry || '',
      preloadPath: adapter.renderer?.preloadPath || '',
      exposeNamespace: adapter.renderer?.exposeNamespace || '',
      channels: adapter.renderer?.channels || {},
      loadContract: adapter.renderer?.loadContract || {},
    },
  };
}

export function createDesktopHostRunnerDraft(target = globalThis) {
  const adapter = createDesktopRuntimeAdapterDraft(target);
  return {
    runtime: adapter.runtime,
    stage: 'desktop-host-runner-draft',
    ready: adapter.ready === true,
    steps: createHostRunnerSteps(adapter),
    pipeline: createHostRunnerPipeline(adapter),
    assembly: adapter.assembly || null,
    handshake: adapter.handshake || null,
    contract: createDesktopRuntimeHostActionContract(target),
  };
}

export function runDesktopHostMockExecution(target = globalThis) {
  const runner = createDesktopHostRunnerDraft(target);
  const checklist = createDesktopRuntimeAdapterChecklist(target);
  return {
    runtime: runner.runtime,
    stage: 'desktop-host-mock-execution',
    ready: runner.ready,
    completedSteps: runner.steps.map((step, index) => ({
      index: index + 1,
      key: step.key,
      simulated: true,
    })),
    pendingTasks: checklist.tasks || [],
    exposeNamespace: runner.pipeline?.renderer?.exposeNamespace || '',
    rendererEntry: runner.pipeline?.renderer?.entry || '',
    loadStrategy: runner.pipeline?.renderer?.strategy || '',
    preloadPath: runner.pipeline?.renderer?.preloadPath || '',
  };
}
