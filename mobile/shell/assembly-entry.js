import { mobileHostBridge } from './bridge/host.js';
import { mobileFilesBridge } from './bridge/files.js';
import { mobileStorageBridge } from './bridge/storage.js';
import { mobileAssetsBridge } from './bridge/assets.js';
import { mobileKeysBridge } from './bridge/keys.js';
import { createMobileFileStorageBackend } from './mobile-storage-backend.js';

function resolveDefaultTarget() {
  if (typeof window !== 'undefined') return window;
  if (typeof globalThis !== 'undefined') return globalThis;
  return {};
}

function ensurePlatformShape(scope) {
  const target = scope || resolveDefaultTarget();
  target.window = target.window || target;
  target.window.GameModules = target.window.GameModules || {};
  target.window.GameModules.platform = target.window.GameModules.platform || {};
  target.window.GameModules.platform.core = target.window.GameModules.platform.core || {};
  return target.window;
}

function attachAndroidStorageTarget(target = resolveDefaultTarget(), options = {}) {
  const scope = target || resolveDefaultTarget();
  scope.androidBridge = scope.androidBridge || {};
  if (!scope.androidBridge.storage) {
    scope.androidBridge.storage = createMobileFileStorageBackend(options);
  }
  return scope.androidBridge.storage;
}

export function attachMobilePlatformCore(target = resolveDefaultTarget(), options = {}) {
  const scope = ensurePlatformShape(target);
  const storage = attachAndroidStorageTarget(scope, options);
  scope.GameModules.platform.core.host = mobileHostBridge;
  scope.GameModules.platform.core.files = mobileFilesBridge;
  scope.GameModules.platform.core.assets = scope.GameModules.platform.core.assets || {};
  scope.GameModules.platform.core.assets.bodyFigure = mobileAssetsBridge;
  scope.GameModules.platform.core.keys = mobileKeysBridge;
  scope.GameModules.platform.core.storage = scope.GameModules.platform.core.storage || {};
  scope.GameModules.platform.core.storage.mobileBridge = mobileStorageBridge;
  scope.GameModules.platform.mobile = scope.GameModules.platform.mobile || {};
  scope.GameModules.platform.mobile.attachments = {
    host: true,
    files: true,
    storage: true,
    assets: true,
    keys: true,
  };
  scope.GameModules.platform.mobile.storageRoot = storage?.root || null;
  return scope.GameModules.platform.core;
}
