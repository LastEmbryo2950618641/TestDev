import { createAndroidWebViewShellConfigDraft } from './android-webview-shell-config-draft.js';

function createProjectLayout(packageName) {
  const packagePath = packageName.replace(/\./g, '/');
  return {
    projectRoot: 'mobile/android-webview-shell',
    settingsGradle: 'mobile/android-webview-shell/settings.gradle',
    appModule: {
      moduleRoot: 'mobile/android-webview-shell/app',
      manifest: 'mobile/android-webview-shell/app/src/main/AndroidManifest.xml',
      javaRoot: `mobile/android-webview-shell/app/src/main/java/${packagePath}`,
      assetsRoot: 'mobile/android-webview-shell/app/src/main/assets',
      resRoot: 'mobile/android-webview-shell/app/src/main/res',
    },
  };
}

function createRuntimeLayout(configDraft) {
  return {
    webEntryAsset: `mobile/android-webview-shell/app/src/main/assets/${configDraft.renderer.entry}`,
    preloadScriptAsset: 'mobile/android-webview-shell/app/src/main/assets/mobile/shell/bootstrap.js',
    bridgeBootstrapTarget: `${configDraft.bridge.namespace}.${configDraft.bridge.storageNamespace}`,
    readOnlyAssets: [
      'publish/index.html',
      'publish/boot',
      'publish/assets',
    ],
    writableRoots: [
      'app-private://settings',
      'app-private://character-state',
      'app-private://real-world-log',
    ],
  };
}

function createNativeEntryLayout(configDraft, projectLayout) {
  return {
    activityClass: `${configDraft.app.packageName}.${configDraft.app.activity.entry}`,
    bridgeBinderClass: `${configDraft.app.packageName}.bridge.AndroidBridgeBinder`,
    storageAdapterClass: `${configDraft.app.packageName}.storage.AppStorageAdapter`,
    webViewContainerLayout: `${projectLayout.appModule.resRoot}/layout/activity_main.xml`,
  };
}

function createBuildInputs(configDraft) {
  return {
    applicationId: configDraft.app.packageName,
    minSdk: 26,
    targetSdk: 34,
    compileSdk: 34,
    webViewDebugging: true,
    assetPackagingMode: configDraft.renderer.assetMode,
  };
}

function createHostIntegrationTasks() {
  return [
    'create-android-studio-project-shell',
    'copy-publish-runtime-into-app-assets',
    'create-main-activity-and-webview-layout',
    'inject-platformBridge-and-androidBridge-before-runtime-ready',
    'bind-app-private-storage-to-shared-store-contracts',
    'forward-activity-lifecycle-to-mobile-runtime-hooks',
  ];
}

export function createAndroidWebViewShellProjectDraft(options = {}) {
  const configDraft = createAndroidWebViewShellConfigDraft(options);
  const projectLayout = createProjectLayout(configDraft.app.packageName);

  return {
    runtimeFamily: 'android-webview-shell-project-draft',
    stage: 'android-webview-shell-project-draft',
    hostKind: 'mobile',
    shell: 'android-webview-shell',
    configDraft,
    projectLayout,
    runtimeLayout: createRuntimeLayout(configDraft),
    nativeEntryLayout: createNativeEntryLayout(configDraft, projectLayout),
    buildInputs: createBuildInputs(configDraft),
    hostIntegrationTasks: createHostIntegrationTasks(),
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const draft = createAndroidWebViewShellProjectDraft();
  process.stdout.write(`${JSON.stringify(draft, null, 2)}\n`);
}
