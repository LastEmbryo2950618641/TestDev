import fs from 'node:fs';

const requiredPaths = [
  'mobile/android-webview-shell/settings.gradle',
  'mobile/android-webview-shell/build.gradle',
  'mobile/android-webview-shell/gradle.properties',
  'mobile/android-webview-shell/README.md',
  'mobile/android-webview-shell/app/build.gradle',
  'mobile/android-webview-shell/app/proguard-rules.pro',
  'mobile/android-webview-shell/app/src/main/AndroidManifest.xml',
  'mobile/android-webview-shell/app/src/main/java/com/gamefy/shell/MainActivity.java',
  'mobile/android-webview-shell/app/src/main/java/com/gamefy/shell/bridge/AndroidBridgeBinder.java',
  'mobile/android-webview-shell/app/src/main/java/com/gamefy/shell/storage/AppStorageAdapter.java',
  'mobile/android-webview-shell/app/src/main/res/layout/activity_main.xml',
  'mobile/android-webview-shell/app/src/main/res/values/themes.xml',
];

const mainActivitySource = fs.existsSync('mobile/android-webview-shell/app/src/main/java/com/gamefy/shell/MainActivity.java') ? fs.readFileSync('mobile/android-webview-shell/app/src/main/java/com/gamefy/shell/MainActivity.java', 'utf8') : '';
const existing = requiredPaths.filter((item) => fs.existsSync(item));
const missing = requiredPaths.filter((item) => !fs.existsSync(item));

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-webview-shell-project-skeleton-verify',
  ok: missing.length === 0,
  existingCount: existing.length,
  missing,
  runtimeLoadUrlReady: mainActivitySource.includes('file:///android_asset/publish/index.html') && mainActivitySource.includes('webView.loadUrl(RUNTIME_ENTRY_URL);'),
  sample: existing.slice(0, 5),
}, null, 2)}\n`);

