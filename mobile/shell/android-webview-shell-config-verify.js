import path from 'node:path';
import { createAndroidWebViewShellConfigDraft } from './android-webview-shell-config-draft.js';

const draft = createAndroidWebViewShellConfigDraft({
  appId: 'com.gamefy.shell',
  hostPaths: {
    appStorage: path.resolve(process.cwd(), 'mobile', 'shell', '.android-app-data', 'com.gamefy.shell'),
  },
});

const checks = {
  packageNameReady: draft.app?.packageName === 'com.gamefy.shell',
  rendererReady: draft.renderer?.entry === 'publish/index.html' && draft.renderer?.loadStrategy === 'webview-load-url',
  bridgeReady: draft.bridge?.namespace === 'platformBridge' && draft.bridge?.storageNamespace === 'androidBridge' && Array.isArray(draft.bridge?.contracts) && draft.bridge.contracts.includes('storage'),
  storageReady: draft.storage?.rootStrategy === 'host-app-storage' && draft.storage?.channel === 'androidBridge',
  lifecycleReady: draft.lifecycle?.ready === 'webview-ready' && draft.lifecycle?.pause === 'app.onPause' && draft.lifecycle?.resume === 'app.onResume' && draft.lifecycle?.destroy === 'app.onDestroy',
  hostTasksReady: Array.isArray(draft.hostTasks) && draft.hostTasks.length >= 5,
  artifactChecksReady: Object.values(draft.artifactChecks || {}).every(Boolean),
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-webview-shell-config-draft-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: {
    packageName: draft.app?.packageName || '',
    rendererEntry: draft.renderer?.entry || '',
    bridgeNamespace: draft.bridge?.namespace || '',
    storageRootStrategy: draft.storage?.rootStrategy || '',
    readySignal: draft.lifecycle?.ready || '',
  },
}, null, 2)}\n`);

