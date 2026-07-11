// Desktop platform core assembly example
import { desktopHostBridge } from './bridge/host.js';
import { desktopFilesBridge } from './bridge/files.js';
import { desktopStorageBridge } from './bridge/storage.js';
import { desktopAssetsBridge } from './bridge/assets.js';
import { desktopKeysBridge } from './bridge/keys.js';

export function attachDesktopPlatformCore(target = globalThis) {
  target.window = target.window || target;
  target.window.GameModules = target.window.GameModules || {};
  target.window.GameModules.platform = target.window.GameModules.platform || {};
  target.window.GameModules.platform.core = target.window.GameModules.platform.core || {};

  target.window.GameModules.platform.core.host = desktopHostBridge;
  target.window.GameModules.platform.core.files = desktopFilesBridge;
  target.window.GameModules.platform.core.assets = target.window.GameModules.platform.core.assets || {};
  target.window.GameModules.platform.core.assets.bodyFigure = desktopAssetsBridge;
  target.window.GameModules.platform.core.keys = desktopKeysBridge;

  target.window.GameModules.platform.core.storage = target.window.GameModules.platform.core.storage || {};
  target.window.GameModules.platform.core.storage.desktopBridge = desktopStorageBridge;

  return target.window.GameModules.platform.core;
}
