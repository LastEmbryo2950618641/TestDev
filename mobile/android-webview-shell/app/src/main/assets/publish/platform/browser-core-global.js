window.GameModules = window.GameModules || {};

(function attachBrowserCoreFacade(target) {
  function resolveDefaultTarget() {
    if (typeof window !== 'undefined') return window;
    if (typeof globalThis !== 'undefined') return globalThis;
    return {};
  }

  function ensurePlatformShape(scope) {
    const root = scope || resolveDefaultTarget();
    root.GameModules = root.GameModules || {};
    root.GameModules.platform = root.GameModules.platform || {};
    root.GameModules.platform.core = root.GameModules.platform.core || {};
    root.GameModules.platform.browser = root.GameModules.platform.browser || {};
    root.GameModules.platform.storage = root.GameModules.platform.storage || {};
    return root;
  }

  function createBrowserLocalSettingsSource(root) {
    return {
      read(key = 'gamefy-local-settings-v1') {
        try {
          const raw = root?.localStorage?.getItem?.(key);
          return raw ? JSON.parse(raw) : {};
        } catch (_) {
          return {};
        }
      },

      write(key = 'gamefy-local-settings-v1', patch = {}) {
        try {
          const current = this.read(key);
          root?.localStorage?.setItem?.(key, JSON.stringify({ ...current, ...patch }));
          return true;
        } catch (_) {
          return false;
        }
      },
    };
  }

  function attachBrowserPlatformCore(root = resolveDefaultTarget()) {
    const scope = ensurePlatformShape(root);
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

  function readBrowserUiSettings(root = resolveDefaultTarget(), key = 'gamefy-local-settings-v1') {
    const scope = ensurePlatformShape(root);
    const source =
      scope.GameModules.platform.core.storage?.localSettingsSource ||
      scope.GameModules.platform.storage?.localSettingsSource ||
      createBrowserLocalSettingsSource(scope);

    return source.read(key) || {};
  }

  const scope = ensurePlatformShape(target || resolveDefaultTarget());
  scope.GameModules.platform.browserCore = {
    attachBrowserPlatformCore,
    readBrowserUiSettings,
  };
})(window);
