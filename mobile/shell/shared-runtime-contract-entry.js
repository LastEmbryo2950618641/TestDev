import { createSharedHostRuntimeContract } from '../../publish/platform/host/shared-runtime-contract.js';
import { createMobileUnifiedHostContract } from './unified-host-contract.js';

export function createMobileSharedHostRuntimeContract(target = globalThis) {
  const mobile = createMobileUnifiedHostContract(target);
  return createSharedHostRuntimeContract({
    runtime: mobile.runtime,
    hostKind: 'mobile',
    shellLocalOnly: mobile.shellLocalOnly,
    publishTouched: mobile.publishTouched,
    lifecycle: {
      boot: mobile.manifest?.lifecycle?.boot || [],
      attach: mobile.manifest?.lifecycle?.windowing || [],
      load: mobile.manifest?.lifecycle?.loading || [],
      teardown: mobile.manifest?.lifecycle?.shutdown || [],
    },
    view: {
      id: mobile.manifest?.window?.id || '',
      title: mobile.manifest?.window?.title || '',
      containerKind: mobile.manifest?.window?.container || 'android-webview',
    },
    renderer: {
      entry: mobile.manifest?.load?.entry || '',
      loadStrategy: mobile.manifest?.load?.loadStrategy || '',
    },
    bridge: {
      namespace: mobile.manifest?.assembly?.namespace || '',
      assemblyReady: Boolean(mobile.manifest?.assembly?.namespace),
    },
    mapper: {
      readyHook: 'webview-ready',
      attachApi: 'attachWebView',
      loadApi: 'loadRenderer',
      focusApi: 'webview.requestFocus',
      reloadApi: 'webview.reload',
      closeApi: 'destroyWebView',
    },
    checkpoints: mobile.checkpoints,
  });
}
