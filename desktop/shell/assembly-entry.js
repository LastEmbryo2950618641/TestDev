import { desktopHostBridge } from './bridge/host.js';
import { desktopFilesBridge } from './bridge/files.js';
import { desktopStorageBridge } from './bridge/storage.js';
import { desktopAssetsBridge } from './bridge/assets.js';
import { desktopKeysBridge } from './bridge/keys.js';

function resolveDefaultTarget() {
  if (typeof window !== 'undefined') return window;
  if (typeof globalThis !== 'undefined') return globalThis;
  return {};
}

function ensurePlatformShape(scope) {
  const target = scope || resolveDefaultTarget();
  target.GameModules = target.GameModules || {};
  target.GameModules.platform = target.GameModules.platform || {};
  target.GameModules.platform.core = target.GameModules.platform.core || {};
  return target;
}

export function attachDesktopPlatformCore(target = resolveDefaultTarget()) {
  const scope = ensurePlatformShape(target);
  scope.GameModules.platform.core.host = desktopHostBridge;
  scope.GameModules.platform.core.files = desktopFilesBridge;
  scope.GameModules.platform.core.assets = scope.GameModules.platform.core.assets || {};
  scope.GameModules.platform.core.assets.bodyFigure = desktopAssetsBridge;
  scope.GameModules.platform.core.keys = desktopKeysBridge;
  scope.GameModules.platform.core.storage = scope.GameModules.platform.core.storage || {};
  scope.GameModules.platform.core.storage.desktopBridge = desktopStorageBridge;
  scope.GameModules.platform.desktop = scope.GameModules.platform.desktop || {};
  scope.GameModules.platform.desktop.attachments = {
    host: true,
    files: true,
    storage: true,
    assets: true,
    keys: true,
  };
  return scope.GameModules.platform.core;
}
