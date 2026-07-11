import { createAndroidWebViewAssetSyncPlan } from './android-webview-asset-sync-plan.js';

const plan = createAndroidWebViewAssetSyncPlan();
const checks = {
  targetAssetsRootReady: plan.targetAssetsRoot === 'mobile/android-webview-shell/app/src/main/assets',
  entryAssetReady: plan.webEntryAsset === 'mobile/android-webview-shell/app/src/main/assets/publish/index.html',
  runtimeUrlReady: plan.runtimeLoadUrl === 'file:///android_asset/publish/index.html',
  sourceRootReady: plan.sourceRoot === 'publish',
  copyPlanReady: Array.isArray(plan.copyPlan) && plan.copyPlan.length >= 5,
  preserveSharedRuntimeReady: plan.runtimeNotes?.preserveSharedRuntime === true,
};

process.stdout.write(`${JSON.stringify({
  runtimeFamily: 'android-webview-asset-sync-plan-verify',
  ok: Object.values(checks).every(Boolean),
  checks,
  summary: {
    runtimeLoadUrl: plan.runtimeLoadUrl,
    targetAssetsRoot: plan.targetAssetsRoot,
    firstCopyTask: plan.copyPlan?.[0] || null,
  },
}, null, 2)}\n`);

