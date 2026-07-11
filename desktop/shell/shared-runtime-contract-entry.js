import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSharedHostRuntimeContract } from '../../publish/platform/host/shared-runtime-contract.js';
import { createDesktopUnifiedHostContract } from './unified-host-contract.js';

function resolveShellDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function readDesktopSmokeArtifact() {
  try {
    const shellDir = resolveShellDir();
    const artifactPath = path.resolve(shellDir, '.artifacts', 'attempt-launch-result.json');
    return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  } catch {
    return null;
  }
}

function createSmokeArtifactEvidence(smokeArtifact = null) {
  const checks = smokeArtifact?.checks || {};
  return {
    enabled: smokeArtifact?.enabled === true,
    windowCreated: checks.windowCreated === true,
    preloadExposed: checks.preloadExposed === true,
    preloadPlanReady: checks.preloadPlanReady === true,
    storageAttached: checks.storageAttached === true,
    rendererLoaded: checks.rendererLoaded === true,
    preloadNamespace: String(smokeArtifact?.evidence?.preloadNamespace || ''),
    rendererEntry: String(smokeArtifact?.evidence?.rendererEntry || ''),
    storageRootReady: Boolean(smokeArtifact?.evidence?.storageRoot?.baseDir),
  };
}

export function createDesktopSharedHostRuntimeContract(target = globalThis) {
  const desktop = createDesktopUnifiedHostContract(target);
  const smokeArtifact = readDesktopSmokeArtifact();
  const smoke = createSmokeArtifactEvidence(smokeArtifact);
  const smokeBootstrapReady = smoke.preloadPlanReady && smoke.storageAttached && smoke.storageRootReady;
  const smokeLiveRunReady = smoke.enabled && smoke.windowCreated && smoke.preloadExposed && smoke.rendererLoaded;
  const runtimeHandshakeReady = desktop.handshake?.bridgeReady === true || smokeBootstrapReady === true;

  return createSharedHostRuntimeContract({
    runtime: desktop.runtime,
    hostKind: 'desktop',
    shellLocalOnly: desktop.shellLocalOnly,
    publishTouched: desktop.publishTouched,
    lifecycle: {
      boot: desktop.lifecycle?.boot || [],
      attach: desktop.lifecycle?.windowing || desktop.lifecycle?.attach || [],
      load: desktop.lifecycle?.loading || desktop.lifecycle?.load || [],
      teardown: desktop.lifecycle?.shutdown || desktop.lifecycle?.teardown || [],
    },
    view: {
      id: desktop.window?.id || '',
      title: desktop.window?.title || '',
      containerKind: 'BrowserWindow',
    },
    renderer: {
      entry: smoke.rendererEntry || desktop.load?.entry || '',
      loadStrategy: desktop.load?.loadStrategy || '',
    },
    bridge: {
      namespace: smoke.preloadNamespace || desktop.assembly?.namespace || '',
      assemblyReady: Boolean(desktop.assembly?.namespace),
    },
    mapper: {
      readyHook: 'app.whenReady',
      attachApi: 'BrowserWindow.create',
      loadApi: desktop.load?.loadStrategy === 'load-url' ? 'BrowserWindow.loadURL' : 'BrowserWindow.loadFile',
      focusApi: 'BrowserWindow.focus',
      reloadApi: 'webContents.reload',
      closeApi: 'BrowserWindow.close',
    },
    checkpoints: {
      ...desktop.checkpoints,
      handshakeReady: runtimeHandshakeReady,
      smokeArtifactReady: smokeBootstrapReady,
      smokeLiveRunReady,
      smokeEnabled: smoke.enabled,
      smokeWindowCreated: smoke.windowCreated,
      smokePreloadExposed: smoke.preloadExposed,
      smokePreloadPlanReady: smoke.preloadPlanReady,
      smokeStorageAttached: smoke.storageAttached,
      smokeRendererLoaded: smoke.rendererLoaded,
      smokeStorageRootReady: smoke.storageRootReady,
    },
  });
}
