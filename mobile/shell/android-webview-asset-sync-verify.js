import fs from 'node:fs';
import { collectAndroidWebViewAssetParity, syncAndroidWebViewAssets } from './android-webview-asset-sync.js';

const cleanStale = process.argv.includes('--clean-stale');
const result = syncAndroidWebViewAssets({ cleanStale });
const resultPath = 'mobile/android-webview-shell/.last-asset-sync.json';
const persisted = fs.existsSync(resultPath)
  ? JSON.parse(fs.readFileSync(resultPath, 'utf8'))
  : null;
const parity = collectAndroidWebViewAssetParity(result.plan);

const checks = {
  resultReady: persisted !== null,
  syncOk: result?.ok === true && persisted?.ok === true,
  copiedEntryReady: Array.isArray(result?.copied) && result.copied.some((item) => item.to === 'mobile/android-webview-shell/app/src/main/assets/publish/index.html'),
  copiedBootReady: Array.isArray(result?.copied) && result.copied.some((item) => item.to === 'mobile/android-webview-shell/app/src/main/assets/publish/boot'),
  copiedAssetsReady: Array.isArray(result?.copied) && result.copied.some((item) => item.to === 'mobile/android-webview-shell/app/src/main/assets/publish/assets'),
  skippedEmpty: Array.isArray(result?.skipped) && result.skipped.length === 0,
  targetEntryExists: fs.existsSync('mobile/android-webview-shell/app/src/main/assets/publish/index.html'),
  parityOk: parity.ok === true,
  persistedParityOk: persisted?.parity?.ok === true,
  staleStateAligned: cleanStale ? result.cleanStale === true && persisted?.cleanStale === true : true,
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-webview-asset-sync-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: {
    copiedCount: Array.isArray(result?.copied) ? result.copied.length : 0,
    skippedCount: Array.isArray(result?.skipped) ? result.skipped.length : 0,
    staleRemovedCount: Array.isArray(result?.staleRemoved)
      ? result.staleRemoved.reduce((count, item) => count + (Array.isArray(item.removed) ? item.removed.length : 0), 0)
      : 0,
    cleanStale,
    parityComparisons: Array.isArray(parity?.comparisons) ? parity.comparisons.length : 0,
    resultPath,
  },
}, null, 2)}\n`);
