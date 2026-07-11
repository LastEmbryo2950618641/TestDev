import path from 'node:path';
import { createMobileLiveLikeArtifact } from './mobile-live-like-artifact.js';

function normalizePackageName(appId) {
  if (typeof appId === 'string' && appId.trim()) {
    return appId.trim();
  }
  return 'com.gamefy.shell';
}

function createStorageSection(artifact, packageName) {
  const storageRoot = artifact.evidence?.storageRoot || {};
  return {
    bridgeNamespace: artifact.evidence?.bridgeNamespace || 'androidBridge',
    channel: artifact.evidence?.storageChannel || 'androidBridge',
    rootStrategy: storageRoot.strategy || 'host-app-storage',
    resolvedRoot: storageRoot.resolved || path.posix.join('/data/user/0', packageName, 'files', 'gamefy-storage'),
    writableScopes: ['settings', 'character-state', 'real-world-log'],
  };
}

function createLifecycleSection(artifact) {
  const lifecycle = artifact.evidence?.lifecycle?.lifecycle || {};
  return {
    ready: lifecycle.ready || 'webview-ready',
    pause: lifecycle.pause || 'app.onPause',
    resume: lifecycle.resume || 'app.onResume',
    destroy: lifecycle.destroy || 'app.onDestroy',
    bootActions: artifact.evidence?.lifecycle?.bootActions || [],
    shutdownHooks: artifact.evidence?.lifecycle?.shutdownHooks || [],
  };
}

function createHostTasks() {
  return [
    'create-single-activity-webview-container',
    'expose-window-androidBridge-storage-contract',
    'map-app-private-storage-for-shared-stores',
    'forward-webview-ready-and-app-lifecycle-events',
    'package-publish-assets-as-readonly-web-runtime',
  ];
}

export function createAndroidWebViewShellConfigDraft(options = {}) {
  const packageName = normalizePackageName(options.appId);
  const artifact = createMobileLiveLikeArtifact({
    appId: packageName,
    hostPaths: options.hostPaths,
    baseDir: options.baseDir,
  });

  return {
    runtimeFamily: 'android-webview-shell-config-draft',
    stage: 'android-webview-shell-config-draft',
    hostKind: 'mobile',
    recommendedShell: 'android-webview-shell',
    app: {
      packageName,
      applicationLabel: options.applicationLabel || 'Gamefy Shell',
      activity: {
        entry: options.activityName || 'MainActivity',
        role: 'single-webview-host',
      },
    },
    renderer: {
      entry: artifact.evidence?.rendererEntry || 'publish/index.html',
      loadStrategy: artifact.evidence?.loadStrategy || 'webview-load-url',
      webViewContainerId: options.webViewContainerId || 'gamefy-webview',
      assetMode: 'readonly-packaged-runtime',
    },
    bridge: {
      namespace: artifact.evidence?.bridgeNamespace || 'platformBridge',
      storageNamespace: 'androidBridge',
      contracts: ['storage'],
      optionalContracts: ['host', 'files', 'assets', 'keys'],
    },
    storage: createStorageSection(artifact, packageName),
    lifecycle: createLifecycleSection(artifact),
    hostTasks: createHostTasks(),
    artifactChecks: artifact.checks,
    evidence: {
      storageRoot: artifact.evidence?.storageRoot || null,
      rendererEntry: artifact.evidence?.rendererEntry || '',
      lifecycle: artifact.evidence?.lifecycle || null,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const draft = createAndroidWebViewShellConfigDraft();
  process.stdout.write(`${JSON.stringify(draft, null, 2)}\n`);
}

