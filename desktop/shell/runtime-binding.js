// Desktop runtime binding draft
import { createDesktopBootstrapDraft } from './bootstrap.js';

function toLifecycleSteps(lifecycle = {}) {
  return [
    ...(Array.isArray(lifecycle.boot) ? lifecycle.boot : []),
    ...(Array.isArray(lifecycle.windowing) ? lifecycle.windowing : []),
    ...(Array.isArray(lifecycle.loading) ? lifecycle.loading : []),
    ...(Array.isArray(lifecycle.shutdown) ? lifecycle.shutdown : []),
  ];
}

export function createDesktopRuntimeBindingDraft(target = globalThis) {
  const bootstrapDraft = createDesktopBootstrapDraft(target);
  const manifest = bootstrapDraft.manifest || {};
  return {
    runtime: manifest.runtime || 'electron',
    stage: 'desktop-runtime-binding-draft',
    source: 'desktop-bootstrap-manifest',
    actions: {
      appReady: manifest.lifecycle?.boot || [],
      createWindow: manifest.lifecycle?.windowing || [],
      loadRenderer: manifest.lifecycle?.loading || [],
      shutdown: manifest.lifecycle?.shutdown || [],
    },
    bindings: {
      mainEntry: manifest.main || null,
      window: manifest.window || null,
      load: manifest.load || null,
      preload: manifest.preload || null,
      expose: manifest.expose || null,
      assembly: manifest.assembly || null,
      handshake: manifest.handshake || null,
    },
    checkpoints: bootstrapDraft.checkpoints || {},
  };
}

export function createDesktopRuntimeExecutionPlan(target = globalThis) {
  const runtimeBinding = createDesktopRuntimeBindingDraft(target);
  return {
    runtime: runtimeBinding.runtime,
    stage: runtimeBinding.stage,
    sequence: toLifecycleSteps(runtimeBinding.actions),
    loadStrategy: runtimeBinding.bindings?.load?.loadStrategy || '',
    rendererEntry: runtimeBinding.bindings?.load?.entry || '',
    preloadPath: runtimeBinding.bindings?.load?.preload || '',
    ready: Object.values(runtimeBinding.checkpoints || {}).every(Boolean),
  };
}
