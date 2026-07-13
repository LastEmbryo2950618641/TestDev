window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.localSettingsSource = window.GameModules.platform.storage.localSettingsSource || {
  read(key = 'gamefy-local-settings-v1') {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  },

  write(key = 'gamefy-local-settings-v1', patch = {}) {
    try {
      const current = this.read(key);
      localStorage.setItem(key, JSON.stringify({ ...current, ...patch }));
      return true;
    } catch (_) {
      return false;
    }
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.localSettingsSource = window.GameModules.platform.core.storage.localSettingsSource || window.GameModules.platform.storage.localSettingsSource;
