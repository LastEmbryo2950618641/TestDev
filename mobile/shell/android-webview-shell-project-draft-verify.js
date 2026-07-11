import { createAndroidWebViewShellProjectDraft } from './android-webview-shell-project-draft.js';

const draft = createAndroidWebViewShellProjectDraft({
  appId: 'com.gamefy.shell',
});

const checks = {
  projectRootReady: draft.projectLayout?.projectRoot === 'mobile/android-webview-shell',
  manifestReady: draft.projectLayout?.appModule?.manifest === 'mobile/android-webview-shell/app/src/main/AndroidManifest.xml',
  javaRootReady: String(draft.projectLayout?.appModule?.javaRoot || '').endsWith('com/gamefy/shell'),
  assetEntryReady: draft.runtimeLayout?.webEntryAsset === 'mobile/android-webview-shell/app/src/main/assets/publish/index.html',
  bridgeBinderReady: draft.nativeEntryLayout?.bridgeBinderClass === 'com.gamefy.shell.bridge.AndroidBridgeBinder',
  storageAdapterReady: draft.nativeEntryLayout?.storageAdapterClass === 'com.gamefy.shell.storage.AppStorageAdapter',
  sdkReady: draft.buildInputs?.compileSdk === 34 && draft.buildInputs?.targetSdk === 34,
  hostTasksReady: Array.isArray(draft.hostIntegrationTasks) && draft.hostIntegrationTasks.length >= 6,
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-webview-shell-project-draft-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: {
    projectRoot: draft.projectLayout?.projectRoot || '',
    applicationId: draft.buildInputs?.applicationId || '',
    webEntryAsset: draft.runtimeLayout?.webEntryAsset || '',
    activityClass: draft.nativeEntryLayout?.activityClass || '',
  },
}, null, 2)}\n`);
