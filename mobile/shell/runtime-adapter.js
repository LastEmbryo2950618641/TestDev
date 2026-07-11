// Mobile runtime adapter draft
import { createMobileRuntimeBindingDraft, createMobileRuntimeExecutionPlan } from './runtime-binding.js';

function createAppAdapterDraft(runtimeBinding) {
  return {
    runtime: runtimeBinding.runtime,
    readyHook: 'webview-ready',
    bootActions: runtimeBinding.actions?.appReady || [],
    shutdownHooks: runtimeBinding.actions?.shutdown || [],
    lifecycle: {
      ready: 'webview-ready',
      pause: 'app.onPause',
      resume: 'app.onResume',
      destroy: 'app.onDestroy',
    },
  };
}

function createWebViewAdapterDraft(runtimeBinding) {
  return {
    factory: 'AndroidWebView',
    createActions: runtimeBinding.actions?.attachWebView || [],
    window: runtimeBinding.bindings?.window || null,
    events: {
      pageFinished: 'webview.onPageFinished',
      renderProcessGone: 'webview.onRenderProcessGone',
      focus: 'webview.requestFocus',
    },
  };
}

function createRendererAdapterDraft(runtimeBinding, executionPlan) {
  return {
    loadActions: runtimeBinding.actions?.loadRenderer || [],
    strategy: executionPlan.loadStrategy || '',
    entry: executionPlan.rendererEntry || '',
    exposeNamespace: runtimeBinding.bindings?.assembly?.namespace || '',
    channels: {
      bridge: ['platformBridge:attach', 'platformBridge:ready'],
      storage: ['storage:readSettings', 'storage:writeSettings'],
    },
    loadContract: {
      webviewLoadUrl: executionPlan.loadStrategy === 'webview-load-url',
      waitForPageFinished: true,
    },
  };
}

export function createMobileRuntimeAdapterDraft(target = globalThis) {
  const runtimeBinding = createMobileRuntimeBindingDraft(target);
  const executionPlan = createMobileRuntimeExecutionPlan(target);
  return {
    runtime: runtimeBinding.runtime,
    stage: 'mobile-runtime-adapter-draft',
    source: runtimeBinding.source,
    app: createAppAdapterDraft(runtimeBinding),
    webview: createWebViewAdapterDraft(runtimeBinding),
    renderer: createRendererAdapterDraft(runtimeBinding, executionPlan),
    assembly: runtimeBinding.bindings?.assembly || null,
    ready: executionPlan.ready === true,
  };
}

export function createMobileRuntimeHostActionContract(target = globalThis) {
  const adapter = createMobileRuntimeAdapterDraft(target);
  return {
    runtime: adapter.runtime,
    stage: 'mobile-runtime-host-action-contract',
    app: {
      readyHook: adapter.app?.readyHook || '',
      lifecycle: adapter.app?.lifecycle || {},
    },
    webview: {
      factory: adapter.webview?.factory || '',
      events: adapter.webview?.events || {},
      window: adapter.webview?.window || {},
    },
    renderer: {
      strategy: adapter.renderer?.strategy || '',
      entry: adapter.renderer?.entry || '',
      loadContract: adapter.renderer?.loadContract || {},
      channels: adapter.renderer?.channels || {},
      exposeNamespace: adapter.renderer?.exposeNamespace || '',
    },
  };
}
