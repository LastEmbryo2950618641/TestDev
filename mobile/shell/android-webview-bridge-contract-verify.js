import fs from 'node:fs';

const bridgePath = 'mobile/android-webview-shell/app/src/main/java/com/gamefy/shell/bridge/AndroidBridgeBinder.java';
const storagePath = 'mobile/android-webview-shell/app/src/main/java/com/gamefy/shell/storage/AppStorageAdapter.java';
const bridgeSource = fs.existsSync(bridgePath) ? fs.readFileSync(bridgePath, 'utf8') : '';
const storageSource = fs.existsSync(storagePath) ? fs.readFileSync(storagePath, 'utf8') : '';

const checks = {
  bridgeFileReady: bridgeSource.length > 0,
  storageFileReady: storageSource.length > 0,
  javaScriptInterfaceReady: bridgeSource.includes('@JavascriptInterface'),
  jsBindingReady: bridgeSource.includes('addJavascriptInterface') && bridgeSource.includes('androidBridgeStorage'),
  rawMethodsReady: bridgeSource.includes('readRaw') && bridgeSource.includes('writeRaw') && bridgeSource.includes('removeRaw'),
  settingsMethodsReady: bridgeSource.includes('readSettings') && bridgeSource.includes('writeSettings'),
  storageAdapterReady: storageSource.includes('SharedPreferences') && storageSource.includes('readRaw') && storageSource.includes('writeRaw') && storageSource.includes('removeRaw'),
  bootstrapReady: bridgeSource.includes('window.androidBridge.storage=window.androidBridgeStorage') && bridgeSource.includes('window.platformBridge.storage=window.androidBridgeStorage') && bridgeSource.includes('window.platformBridge.host=window.androidHostBridge'),
  hostBridgeReady: bridgeSource.includes('class AndroidHostBridge') || bridgeSource.includes('final class AndroidHostBridge'),
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-webview-bridge-contract-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: {
    bridgePath,
    storagePath,
  },
}, null, 2)}\n`);

