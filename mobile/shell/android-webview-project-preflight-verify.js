import fs from 'node:fs';

const required = {
  rootBuild: 'mobile/android-webview-shell/build.gradle',
  settingsGradle: 'mobile/android-webview-shell/settings.gradle',
  appBuild: 'mobile/android-webview-shell/app/build.gradle',
  manifest: 'mobile/android-webview-shell/app/src/main/AndroidManifest.xml',
  mainActivity: 'mobile/android-webview-shell/app/src/main/java/com/gamefy/shell/MainActivity.java',
  bridgeBinder: 'mobile/android-webview-shell/app/src/main/java/com/gamefy/shell/bridge/AndroidBridgeBinder.java',
  storageAdapter: 'mobile/android-webview-shell/app/src/main/java/com/gamefy/shell/storage/AppStorageAdapter.java',
  runtimeEntry: 'mobile/android-webview-shell/app/src/main/assets/publish/index.html',
};

const buildSource = fs.existsSync(required.appBuild) ? fs.readFileSync(required.appBuild, 'utf8') : '';
const manifestSource = fs.existsSync(required.manifest) ? fs.readFileSync(required.manifest, 'utf8') : '';
const mainActivitySource = fs.existsSync(required.mainActivity) ? fs.readFileSync(required.mainActivity, 'utf8') : '';

const checks = {
  filesReady: Object.values(required).every((file) => fs.existsSync(file)),
  androidPluginReady: buildSource.includes("com.android.application"),
  sdkReady: buildSource.includes('compileSdk 34') && buildSource.includes('targetSdk 34') && buildSource.includes('minSdk 26'),
  manifestReady: manifestSource.includes('.MainActivity') && manifestSource.includes('android.intent.action.MAIN'),
  runtimeEntryReady: mainActivitySource.includes('file:///android_asset/publish/index.html'),
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-webview-project-preflight-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  required,
}, null, 2)}\n`);
