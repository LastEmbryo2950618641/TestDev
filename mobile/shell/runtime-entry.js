// Mobile runtime entry draft
import { createMobileRuntimeHostActionContract } from './runtime-adapter.js';
import { createMobileHostRunnerDraft } from './host-runner.js';

export function createMobileRuntimeEntry(target = globalThis) {
  const runner = createMobileHostRunnerDraft(target);
  return {
    runtime: runner.runtime,
    stage: 'mobile-runtime-entry-draft',
    contract: createMobileRuntimeHostActionContract(target),
    pipeline: runner.pipeline,
    steps: runner.steps,
    assembly: runner.assembly || null,
  };
}

export function createMobileRuntimeInvokeDraft(target = globalThis) {
  const entry = createMobileRuntimeEntry(target);
  return {
    readyHook: entry.pipeline?.app?.readyHook || '',
    webviewFactory: entry.pipeline?.webview?.factory || '',
    rendererEntry: entry.pipeline?.renderer?.entry || '',
    executeWith: 'mobile-webview-like-runtime',
    ready: Boolean(entry.pipeline?.app?.readyHook && entry.pipeline?.webview?.factory),
  };
}

export function createMobileOptionalRuntimeCall(runtimeLike, target = globalThis) {
  const entry = createMobileRuntimeEntry(target);
  const canAttach = typeof runtimeLike?.attachWebView === 'function';
  const canLoad = typeof runtimeLike?.loadRenderer === 'function';
  return {
    readyHook: entry.pipeline?.app?.readyHook || '',
    webviewFactory: entry.pipeline?.webview?.factory || '',
    rendererEntry: entry.pipeline?.renderer?.entry || '',
    canInvoke: canAttach && canLoad,
    invoke() {
      if (!canAttach || !canLoad) {
        return {
          invoked: false,
          reason: 'runtime-missing-attachWebView-or-loadRenderer',
          readyHook: entry.pipeline?.app?.readyHook || '',
        };
      }
      const webviewResult = runtimeLike.attachWebView(entry.pipeline?.webview?.window || {});
      const loadResult = runtimeLike.loadRenderer(entry.pipeline?.renderer?.entry || '');
      return {
        invoked: true,
        webviewResult,
        loadResult,
      };
    },
  };
}
