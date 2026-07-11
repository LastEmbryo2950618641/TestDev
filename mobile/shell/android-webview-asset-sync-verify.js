import fs from 'node:fs';
import { syncAndroidWebViewAssets } from './android-webview-asset-sync.js';

const result = syncAndroidWebViewAssets();
const resultPath = 'mobile/android-webview-shell/.last-asset-sync.json';
const persisted = fs.existsSync(resultPath)
  ? JSON.parse(fs.readFileSync(resultPath, 'utf8'))
  : null;

const checks = {
  resultReady: persisted !== null,
  syncOk: result?.ok === true && persisted?.ok === true,
  copiedEntryReady: Array.isArray(result?.copied) && result.copied.some((item) => item.to === 'mobile/android-webview-shell/app/src/main/assets/publish/index.html'),
  copiedBootReady: Array.isArray(result?.copied) && result.copied.some((item) => item.to === 'mobile/android-webview-shell/app/src/main/assets/publish/boot'),
  copiedAssetsReady: Array.isArray(result?.copied) && result.copied.some((item) => item.to === 'mobile/android-webview-shell/app/src/main/assets/publish/assets'),
  skippedEmpty: Array.isArray(result?.skipped) && result.skipped.length === 0,
  targetEntryExists: fs.existsSync('mobile/android-webview-shell/app/src/main/assets/publish/index.html'),
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-webview-asset-sync-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: {
    copiedCount: Array.isArray(result?.copied) ? result.copied.length : 0,
    skippedCount: Array.isArray(result?.skipped) ? result.skipped.length : 0,
    resultPath,
  },
}, null, 2)}\n`);
