// Electron runtime main entry skeleton
// This file is intentionally host-local and should be the first real Electron replacement point.
import './electron-main-entry-log.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDesktopRuntimePaths } from './desktop-runtime-paths.js';
import { createDesktopUnifiedHostContract } from './unified-host-contract.js';
import { createOptionalElectronApiAdapter } from './electron-api-adapter.js';
import { attemptDesktopElectronRealLaunch } from './electron-real-launch-attempt.js';
import { createElectronPreloadFullExposePayload } from './electron-preload.js';

function resolveShellPaths() {
  const shellDir = path.dirname(fileURLToPath(import.meta.url));
  return resolveDesktopRuntimePaths(shellDir);
}

export function createElectronRuntimeSkeleton(target = globalThis) {
  const contract = createDesktopUnifiedHostContract(target);
  const paths = resolveShellPaths();
  return {
    runtime: 'electron',
    stage: 'desktop-electron-runtime-skeleton',
    shellLocalOnly: true,
    contract,
    paths,
    browserWindowOptions: {
      ...contract.load?.browserWindowOptions,
      webPreferences: {
        ...(contract.load?.browserWindowOptions?.webPreferences || {}),
        preload: paths.preloadPath,
      },
    },
    rendererLoad: {
      entry: paths.rendererEntry,
      strategy: 'load-file',
    },
  };
}

function createHostStorageOptions(scope, options = {}) {
  const adapter = options.adapter || null;
  const hostPaths = options.hostPaths || {};
  const shellPaths = options.shellPaths || resolveShellPaths();

  return {
    ...options,
    electronApp: options.electronApp || adapter?.app,
    hostPaths: {
      ...hostPaths,
      shellDir: shellPaths.shellDir,
    },
    appName: options.appName || 'Gamefy',
    baseDir: options.baseDir,
  };
}

export function attachElectronStorageTarget(target = globalThis, options = {}) {
  const scope = target || globalThis;
  const electron = scope.electron || {};
  if (!electron.storage) {
    electron.storage = createElectronPreloadFullExposePayload(scope, createHostStorageOptions(scope, options)).storage;
  }
  scope.electron = electron;
  return electron.storage;
}

export async function createElectronRuntimeOptionalRealCall(target = globalThis) {
  const skeleton = createElectronRuntimeSkeleton(target);
  const adapter = await createOptionalElectronApiAdapter();
  return {
    runtime: skeleton.runtime,
    stage: 'desktop-electron-runtime-optional-real-call',
    shellLocalOnly: true,
    available: adapter.available === true,
    reason: adapter.reason || '',
    browserWindowOptions: skeleton.browserWindowOptions,
    rendererLoad: skeleton.rendererLoad,
    realApis: {
      appReady: adapter.available ? 'app.whenReady' : '',
      createWindow: adapter.available ? 'new BrowserWindow(options)' : '',
      loadRenderer: adapter.available ? 'browserWindow.loadFile(entry)' : '',
    },
  };
}

export async function createElectronGuardedBootstrapPlan(target = globalThis) {
  const skeleton = createElectronRuntimeSkeleton(target);
  const adapter = await createOptionalElectronApiAdapter();
  return {
    runtime: 'electron',
    stage: 'desktop-electron-guarded-bootstrap-plan',
    shellLocalOnly: true,
    adapterAvailable: adapter.available === true,
    fallbackMode: adapter.available ? '' : 'skeleton-only',
    steps: adapter.available
      ? [
          'app.whenReady',
          'new BrowserWindow(browserWindowOptions)',
          `browserWindow.loadFile(${JSON.stringify(skeleton.rendererLoad.entry)})`,
        ]
      : [
          'skip-real-electron-bootstrap',
          'keep-shell-verification-mode',
        ],
  };
}

export async function createElectronRuntimeBranch(options = {}, target = globalThis) {
  const enabled = options.enabled === true;
  const guardedBootstrap = await createElectronGuardedBootstrapPlan(target);
  return {
    runtime: 'electron',
    stage: 'desktop-electron-runtime-branch',
    shellLocalOnly: true,
    enabled,
    willExecuteRealBootstrap: enabled && guardedBootstrap.adapterAvailable === true,
    fallbackMode: enabled ? guardedBootstrap.fallbackMode || '' : 'disabled-by-default',
    steps: enabled ? guardedBootstrap.steps : ['skip-real-electron-bootstrap', 'wait-for-explicit-enable'],
  };
}

export async function bootstrapElectronRuntime(target = globalThis) {
  const skeleton = createElectronRuntimeSkeleton(target);
  const optionalRealCall = await createElectronRuntimeOptionalRealCall(target);
  const guardedBootstrap = await createElectronGuardedBootstrapPlan(target);
  const runtimeBranch = await createElectronRuntimeBranch({ enabled: false }, target);
  const adapter = await createOptionalElectronApiAdapter();
  const storage = attachElectronStorageTarget(target, {
    adapter,
    shellPaths: skeleton.paths,
    appName: 'Gamefy',
  });
  return {
    runtime: skeleton.runtime,
    stage: 'desktop-electron-runtime-bootstrap',
    shellLocalOnly: skeleton.shellLocalOnly,
    browserWindowOptions: skeleton.browserWindowOptions,
    rendererLoad: skeleton.rendererLoad,
    contractReady: Object.values(skeleton.contract.checkpoints || {}).every(Boolean),
    optionalRealCall,
    guardedBootstrap,
    runtimeBranch,
    storageAttached: ['readSettings', 'writeSettings', 'readRaw', 'writeRaw', 'removeRaw'].every((key) => typeof storage?.[key] === 'function'),
    storageRoot: storage?.root || null,
  };
}

const isElectronHostEntry = process.argv.includes('--codex-electron-launch');

if (isElectronHostEntry) {
  const result = await attemptDesktopElectronRealLaunch({ enabled: true });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  const adapter = await createOptionalElectronApiAdapter();
  if (adapter.available && typeof adapter.app?.quit === 'function') {
    await adapter.app.quit();
  }
}
