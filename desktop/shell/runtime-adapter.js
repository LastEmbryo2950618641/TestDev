// Desktop runtime adapter draft
import { createDesktopRuntimeBindingDraft, createDesktopRuntimeExecutionPlan } from './runtime-binding.js';

function createAppAdapterDraft(runtimeBinding) {
  return {
    runtime: runtimeBinding.runtime,
    readyHook: 'app.whenReady',
    bootActions: runtimeBinding.actions?.appReady || [],
    shutdownHooks: runtimeBinding.actions?.shutdown || [],
    lifecycle: {
      ready: 'app.whenReady',
      activate: 'app.on(activate)',
      windowAllClosed: 'app.on(window-all-closed)',
      beforeQuit: 'app.on(before-quit)',
    },
  };
}

function createWindowAdapterDraft(runtimeBinding) {
  return {
    factory: 'BrowserWindow',
    createActions: runtimeBinding.actions?.createWindow || [],
    options: runtimeBinding.bindings?.load?.browserWindowOptions || {},
    window: runtimeBinding.bindings?.window || null,
    events: {
      readyToShow: 'browserWindow.once(ready-to-show)',
      closed: 'browserWindow.on(closed)',
      focus: 'browserWindow.focus()',
    },
  };
}

function createRendererAdapterDraft(runtimeBinding, executionPlan) {
  return {
    loadActions: runtimeBinding.actions?.loadRenderer || [],
    strategy: executionPlan.loadStrategy || '',
    entry: executionPlan.rendererEntry || '',
    preloadPath: executionPlan.preloadPath || '',
    exposeNamespace: runtimeBinding.bindings?.expose?.namespace || '',
    channels: runtimeBinding.bindings?.assembly?.ipcChannels || {},
    loadContract: {
      loadFile: executionPlan.loadStrategy === 'load-file',
      loadURL: executionPlan.loadStrategy === 'load-url',
      waitForReadyToShow: true,
    },
  };
}

export function createDesktopRuntimeAdapterDraft(target = globalThis) {
  const runtimeBinding = createDesktopRuntimeBindingDraft(target);
  const executionPlan = createDesktopRuntimeExecutionPlan(target);
  return {
    runtime: runtimeBinding.runtime,
    stage: 'desktop-runtime-adapter-draft',
    source: runtimeBinding.source,
    app: createAppAdapterDraft(runtimeBinding),
    window: createWindowAdapterDraft(runtimeBinding),
    renderer: createRendererAdapterDraft(runtimeBinding, executionPlan),
    assembly: runtimeBinding.bindings?.assembly || null,
    handshake: runtimeBinding.bindings?.handshake || null,
    ready: executionPlan.ready === true,
  };
}

export function createDesktopRuntimeAdapterChecklist(target = globalThis) {
  const adapter = createDesktopRuntimeAdapterDraft(target);
  return {
    runtime: adapter.runtime,
    stage: adapter.stage,
    tasks: [
      'bind-app-ready-hook',
      'bind-app-lifecycle-events',
      'create-main-window-instance',
      'bind-window-events',
      'attach-preload-bridge',
      'load-renderer-entry',
      'register-shutdown-hooks',
    ],
    ready: adapter.ready,
    rendererStrategy: adapter.renderer?.strategy || '',
    exposeNamespace: adapter.renderer?.exposeNamespace || '',
  };
}

export function createDesktopRuntimeHostActionContract(target = globalThis) {
  const adapter = createDesktopRuntimeAdapterDraft(target);
  return {
    runtime: adapter.runtime,
    stage: 'desktop-runtime-host-action-contract',
    app: {
      readyHook: adapter.app?.readyHook || '',
      lifecycle: adapter.app?.lifecycle || {},
    },
    window: {
      factory: adapter.window?.factory || '',
      events: adapter.window?.events || {},
      options: adapter.window?.options || {},
    },
    renderer: {
      strategy: adapter.renderer?.strategy || '',
      entry: adapter.renderer?.entry || '',
      preloadPath: adapter.renderer?.preloadPath || '',
      loadContract: adapter.renderer?.loadContract || {},
      channels: adapter.renderer?.channels || {},
    },
  };
}
