// Mobile unified host contract draft
// Aggregates mobile shell drafts into one WebView-like host authority for future APK shells.
import { createMobileBootstrapDraft, createMobileBootstrapManifest } from './bootstrap.js';
import { createMobileRuntimeBindingDraft, createMobileRuntimeExecutionPlan } from './runtime-binding.js';
import { createMobileRuntimeAdapterDraft, createMobileRuntimeHostActionContract } from './runtime-adapter.js';
import { createMobileHostRunnerDraft } from './host-runner.js';

function createMobileWebViewLikeMapper() {
  const calls = [];
  const state = {
    ready: false,
    webviewAttached: false,
    webviewFocused: false,
    rendererLoaded: false,
    rendererReloaded: false,
    webviewDestroyed: false,
    rendererEntry: '',
    webviewId: '',
  };

  function record(type, payload = {}) {
    const event = { index: calls.length + 1, type, ...payload };
    calls.push(event);
    return event;
  }

  const webviewHandle = {
    id: 'main-webview',
    focus() {
      state.webviewFocused = true;
      return record('focusWebView', { webviewId: this.id, ok: true });
    },
    reload() {
      state.rendererReloaded = true;
      return record('reloadRenderer', {
        webviewId: this.id,
        entry: state.rendererEntry,
        ok: true,
      });
    },
    destroy() {
      state.webviewDestroyed = true;
      return record('destroyWebView', { webviewId: this.id, ok: true });
    },
  };

  return {
    runtime: 'mobile-webview',
    stage: 'mobile-webview-like-mapper-draft',
    calls,
    state,
    lifecycle: {
      onReady() {
        state.ready = true;
        return record('onReady', { ok: true });
      },
    },
    runtimeLike: {
      attachWebView(windowConfig) {
        state.webviewAttached = true;
        state.webviewId = webviewHandle.id;
        record('attachWebView', { webviewId: webviewHandle.id, windowConfig, ok: true });
        return webviewHandle;
      },
      loadRenderer(entry) {
        state.rendererLoaded = true;
        state.rendererEntry = String(entry || '');
        return record('loadRenderer', {
          entry: state.rendererEntry,
          strategy: 'webview-load-url',
          ok: true,
        });
      },
      focusWebView(webviewRef) {
        return webviewRef?.focus?.() || record('focusWebViewSkipped', { reason: 'missing-webview-ref' });
      },
      reloadRenderer(webviewRef) {
        return webviewRef?.reload?.() || record('reloadRendererSkipped', { reason: 'missing-webview-ref' });
      },
      destroyWebView(webviewRef) {
        return webviewRef?.destroy?.() || record('destroyWebViewSkipped', { reason: 'missing-webview-ref' });
      },
    },
  };
}

export function createMobileUnifiedHostContract(target = globalThis) {
  const bootstrap = createMobileBootstrapDraft(target);
  const manifest = createMobileBootstrapManifest(target);
  const binding = createMobileRuntimeBindingDraft(target);
  const execution = createMobileRuntimeExecutionPlan(target);
  const adapter = createMobileRuntimeAdapterDraft(target);
  const runner = createMobileHostRunnerDraft(target);
  const mapper = createMobileWebViewLikeMapper();

  return {
    runtime: 'mobile-webview',
    stage: 'mobile-unified-host-contract-draft',
    shellLocalOnly: true,
    publishTouched: false,
    manifest,
    bootstrap,
    binding,
    execution,
    adapter,
    runner,
    mapper,
    contract: createMobileRuntimeHostActionContract(target),
    checkpoints: {
      lifecycleReady: Array.isArray(manifest.lifecycle?.boot) && manifest.lifecycle.boot.length > 0,
      windowReady: Boolean(manifest.window?.id),
      loadReady: Boolean(manifest.load?.entry),
      assemblyReady: Boolean(manifest.assembly?.namespace),
      bindingReady: execution.ready === true,
      adapterReady: adapter.ready === true,
      runnerReady: runner.ready === true,
      mapperReady: true,
    },
  };
}

export function createMobileUnifiedHostExecutionDraft(target = globalThis) {
  const contract = createMobileUnifiedHostContract(target);
  return {
    runtime: contract.runtime,
    stage: 'mobile-unified-host-execution-draft',
    sequence: [
      'webview-ready',
      'attach-main-webview',
      'load-renderer-entry',
      'webview.requestFocus',
      'webview.reload',
      'destroy-webview',
    ],
    contract,
    ready: Object.values(contract.checkpoints).every(Boolean),
  };
}
