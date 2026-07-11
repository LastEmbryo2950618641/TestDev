import path from 'node:path';
import { createAndroidWebViewShellProjectDraft } from './android-webview-shell-project-draft.js';

function createCopyTask(from, to, mode = 'copy') {
  return { from, to, mode };
}

export function createAndroidWebViewAssetSyncPlan(options = {}) {
  const draft = createAndroidWebViewShellProjectDraft(options);
  const assetsRoot = draft.projectLayout?.appModule?.assetsRoot || 'mobile/android-webview-shell/app/src/main/assets';
  const webEntryAsset = draft.runtimeLayout?.webEntryAsset || `${assetsRoot}/publish/index.html`;
  const assetBase = path.posix.dirname(webEntryAsset);

  return {
    runtimeFamily: 'android-webview-asset-sync-plan',
    stage: 'android-webview-asset-sync-plan',
    hostKind: 'mobile',
    shell: 'android-webview-shell',
    sourceRoot: 'publish',
    targetAssetsRoot: assetsRoot,
    webEntryAsset,
    runtimeLoadUrl: 'file:///android_asset/publish/index.html',
    copyPlan: [
      createCopyTask('publish/index.html', `${assetsRoot}/publish/index.html`),
      createCopyTask('publish/boot', `${assetsRoot}/publish/boot`),
      createCopyTask('publish/assets', `${assetsRoot}/publish/assets`),
      createCopyTask('publish/domain', `${assetsRoot}/publish/domain`),
      createCopyTask('publish/ui', `${assetsRoot}/publish/ui`),
    ],
    runtimeNotes: {
      assetBase,
      loadMode: 'android-webview-file-asset',
      preserveSharedRuntime: true,
      publishOwnedBySharedLayer: true,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const plan = createAndroidWebViewAssetSyncPlan();
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}
