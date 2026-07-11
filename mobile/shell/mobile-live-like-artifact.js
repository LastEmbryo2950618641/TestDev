import path from 'node:path';
import { attachMobilePlatformCore } from './assembly-entry.js';
import { createMobileRuntimeEntry } from './runtime-entry.js';
import { createMobileHostRunnerDraft } from './host-runner.js';

function createMockMobileHostTarget() {
  const target = {
    navigator: { userAgent: 'Android Live-Like Host' },
    GameModules: {},
  };
  target.window = target;
  return target;
}

export function createMobileLiveLikeArtifact(options = {}) {
  const target = createMockMobileHostTarget();
  const storageOptions = {
    baseDir: options.baseDir,
    hostPaths: options.hostPaths,
    appId: options.appId || 'com.gamefy.shell',
  };
  const baseDir = options.baseDir || path.resolve(process.cwd(), 'mobile', 'shell', '.live-like-storage');
  if (!storageOptions.baseDir && !storageOptions.hostPaths?.appStorage) {
    storageOptions.baseDir = baseDir;
  }

  const core = attachMobilePlatformCore(target, storageOptions);
  const runner = createMobileHostRunnerDraft(target);
  const runtimeEntry = createMobileRuntimeEntry(target);

  const storageRoot = target?.androidBridge?.storage?.root || null;
  const storageAttached = ['readSettings', 'writeSettings', 'readRaw', 'writeRaw', 'removeRaw']
    .every((key) => typeof target?.androidBridge?.storage?.[key] === 'function');

  const lifecycleEvidence = {
    readyHook: runner.pipeline?.app?.readyHook || '',
    bootActions: Array.isArray(runner.pipeline?.app?.bootActions) ? runner.pipeline.app.bootActions : [],
    shutdownHooks: Array.isArray(runner.pipeline?.app?.shutdownHooks) ? runner.pipeline.app.shutdownHooks : [],
    lifecycle: runner.pipeline?.app?.lifecycle || {},
  };

  return {
    runtimeFamily: 'mobile-live-like-artifact',
    stage: 'mobile-live-like-artifact',
    hostKind: 'mobile',
    checks: {
      hostAttached: core?.host?.kind?.() === 'mobile',
      storageAttached,
      bridgeNamespaceReady: Boolean(runner.pipeline?.renderer?.exposeNamespace),
      rendererEntryReady: Boolean(runner.pipeline?.renderer?.entry),
      webviewLoadReady: runner.pipeline?.renderer?.loadContract?.webviewLoadUrl === true,
      runtimeEntryReady: Boolean(runtimeEntry?.pipeline?.renderer?.entry),
      lifecycleReady: Boolean(lifecycleEvidence.readyHook) && lifecycleEvidence.bootActions.length > 0,
      lifecycleMapReady: Boolean(lifecycleEvidence.lifecycle.ready && lifecycleEvidence.lifecycle.pause && lifecycleEvidence.lifecycle.resume && lifecycleEvidence.lifecycle.destroy),
      hostPathReady: Boolean(storageRoot?.baseDir),
    },
    evidence: {
      bridgeNamespace: runner.pipeline?.renderer?.exposeNamespace || '',
      rendererEntry: runner.pipeline?.renderer?.entry || '',
      loadStrategy: runner.pipeline?.renderer?.strategy || '',
      storageRoot,
      storageChannel: core?.storage?.mobileBridge?.channel?.(target) || '',
      lifecycle: lifecycleEvidence,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = createMobileLiveLikeArtifact();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
