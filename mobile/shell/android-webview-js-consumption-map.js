import { createAndroidWebViewShellConfigDraft } from './android-webview-shell-config-draft.js';
import { createAndroidWebViewAssetSyncPlan } from './android-webview-asset-sync-plan.js';

export function createAndroidWebViewJsConsumptionMap() {
  const configDraft = createAndroidWebViewShellConfigDraft();
  const assetPlan = createAndroidWebViewAssetSyncPlan();

  return {
    runtimeFamily: 'android-webview-js-consumption-map',
    stage: 'android-webview-js-consumption-map',
    hostKind: 'mobile',
    shell: 'android-webview-shell',
    runtimeEntry: assetPlan.runtimeLoadUrl,
    bridgeExposure: {
      androidBridge: {
        storage: 'window.androidBridgeStorage',
      },
      platformBridge: {
        storage: 'window.androidBridgeStorage',
        host: 'window.androidHostBridge',
        capabilities: {
          storage: { ready: true, channel: 'androidBridge' },
          host: { ready: true, kind: 'mobile' },
        },
      },
    },
    sharedConsumptionTargets: [
      'window.GameModules.platform.core.storage.backend',
      'window.GameModules.platform.core.host',
      'window.GameModules.characterStateStore',
      'window.GameModules.realWorldLogStore',
      'window.GameModules.localSettings',
    ],
    contractAlignment: {
      storageMethods: ['readSettings', 'writeSettings', 'readRaw', 'writeRaw', 'removeRaw'],
      hostSignals: ['kind', 'isAndroidShell'],
      rendererEntry: configDraft.renderer?.entry || 'publish/index.html',
    },
    constraints: [
      'do-not-copy-shared-gameplay-into-android-shell',
      'keep-android-private-api-out-of-publish-business-layer',
      'prefer-platformBridge-and-contract-mapping-over-direct-global-calls',
    ],
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const report = createAndroidWebViewJsConsumptionMap();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
