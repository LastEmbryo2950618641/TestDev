// Mobile runtime binding draft
import { createMobileBootstrapDraft } from './bootstrap.js';

function toLifecycleSteps(lifecycle = {}) {
  return [
    ...(Array.isArray(lifecycle.boot) ? lifecycle.boot : []),
    ...(Array.isArray(lifecycle.windowing) ? lifecycle.windowing : []),
    ...(Array.isArray(lifecycle.loading) ? lifecycle.loading : []),
    ...(Array.isArray(lifecycle.shutdown) ? lifecycle.shutdown : []),
  ];
}

export function createMobileRuntimeBindingDraft(target = globalThis) {
  const bootstrapDraft = createMobileBootstrapDraft(target);
  const manifest = bootstrapDraft.manifest || {};
  return {
    runtime: manifest.runtime || 'mobile-webview',
    stage: 'mobile-runtime-binding-draft',
    source: 'mobile-bootstrap-manifest',
    actions: {
      appReady: manifest.lifecycle?.boot || [],
      attachWebView: manifest.lifecycle?.windowing || [],
      loadRenderer: manifest.lifecycle?.loading || [],
      shutdown: manifest.lifecycle?.shutdown || [],
    },
    bindings: {
      window: manifest.window || null,
      load: manifest.load || null,
      assembly: manifest.assembly || null,
    },
    checkpoints: bootstrapDraft.checkpoints || {},
  };
}

export function createMobileRuntimeExecutionPlan(target = globalThis) {
  const runtimeBinding = createMobileRuntimeBindingDraft(target);
  return {
    runtime: runtimeBinding.runtime,
    stage: runtimeBinding.stage,
    sequence: toLifecycleSteps(runtimeBinding.actions),
    loadStrategy: runtimeBinding.bindings?.load?.loadStrategy || '',
    rendererEntry: runtimeBinding.bindings?.load?.entry || '',
    ready: Object.values(runtimeBinding.checkpoints || {}).every(Boolean),
  };
}
