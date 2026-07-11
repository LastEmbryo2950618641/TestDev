import { createAndroidWebViewJsConsumptionMap } from './android-webview-js-consumption-map.js';

const report = createAndroidWebViewJsConsumptionMap();
const checks = {
  runtimeEntryReady: report.runtimeEntry === 'file:///android_asset/publish/index.html',
  androidBridgeReady: report.bridgeExposure?.androidBridge?.storage === 'window.androidBridgeStorage',
  platformBridgeReady: report.bridgeExposure?.platformBridge?.storage === 'window.androidBridgeStorage' && report.bridgeExposure?.platformBridge?.host === 'window.androidHostBridge',
  sharedTargetsReady: Array.isArray(report.sharedConsumptionTargets) && report.sharedConsumptionTargets.includes('window.GameModules.platform.core.storage.backend'),
  storageMethodsReady: Array.isArray(report.contractAlignment?.storageMethods) && report.contractAlignment.storageMethods.length === 5,
  constraintsReady: Array.isArray(report.constraints) && report.constraints.length >= 3,
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-webview-js-consumption-map-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: {
    runtimeEntry: report.runtimeEntry,
    sharedTargets: report.sharedConsumptionTargets,
  },
}, null, 2)}\n`);
