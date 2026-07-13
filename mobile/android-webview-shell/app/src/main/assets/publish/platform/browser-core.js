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
  target.GameModules.platform.browser = target.GameModules.platform.browser || {};
  target.GameModules.platform.storage = target.GameModules.platform.storage || {};
  return target;
}

function createBrowserLocalSettingsSource(target) {
  return {
    read(key = 'gamefy-local-settings-v1') {
      try {
        const raw = target?.localStorage?.getItem?.(key);
        return raw ? JSON.parse(raw) : {};
      } catch (_) {
        return {};
      }
    },

    write(key = 'gamefy-local-settings-v1', patch = {}) {
      try {
        const current = this.read(key);
        target?.localStorage?.setItem?.(key, JSON.stringify({ ...current, ...patch }));
        return true;
      } catch (_) {
        return false;
      }
    },
  };
}

export function attachBrowserPlatformCore(target = resolveDefaultTarget()) {
  const scope = ensurePlatformShape(target);
  const localSettingsSource =
    scope.GameModules.platform.storage.localSettingsSource || createBrowserLocalSettingsSource(scope);

  scope.GameModules.platform.storage.localSettingsSource = localSettingsSource;
  scope.GameModules.platform.core.storage = scope.GameModules.platform.core.storage || {};
  scope.GameModules.platform.core.storage.localSettingsSource =
    scope.GameModules.platform.core.storage.localSettingsSource || localSettingsSource;

  scope.GameModules.platform.browser.attachments = {
    localSettings: true,
    storageCore: true,
  };

  return scope.GameModules.platform.core;
}

export function readBrowserUiSettings(target = resolveDefaultTarget(), key = 'gamefy-local-settings-v1') {
  const scope = ensurePlatformShape(target);
  const source =
    scope.GameModules.platform.core.storage?.localSettingsSource ||
    scope.GameModules.platform.storage?.localSettingsSource ||
    createBrowserLocalSettingsSource(scope);

  return source.read(key) || {};
}
