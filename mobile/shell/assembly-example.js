// Mobile platform core assembly example
import { mobileHostBridge } from './bridge/host.js';
import { mobileFilesBridge } from './bridge/files.js';
import { mobileStorageBridge } from './bridge/storage.js';
import { mobileAssetsBridge } from './bridge/assets.js';
import { mobileKeysBridge } from './bridge/keys.js';

export function attachMobilePlatformCore(target = globalThis) {
  target.window = target.window || target;
  target.window.GameModules = target.window.GameModules || {};
  target.window.GameModules.platform = target.window.GameModules.platform || {};
  target.window.GameModules.platform.core = target.window.GameModules.platform.core || {};

  target.window.GameModules.platform.core.host = mobileHostBridge;
  target.window.GameModules.platform.core.files = mobileFilesBridge;
  target.window.GameModules.platform.core.assets = target.window.GameModules.platform.core.assets || {};
  target.window.GameModules.platform.core.assets.bodyFigure = mobileAssetsBridge;
  target.window.GameModules.platform.core.keys = mobileKeysBridge;

  target.window.GameModules.platform.core.storage = target.window.GameModules.platform.core.storage || {};
  target.window.GameModules.platform.core.storage.mobileBridge = mobileStorageBridge;

  return target.window.GameModules.platform.core;
}
