window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.sqliteSlotSource = {
  read(key = '') {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  },

  write(key = '', value = '') {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (_) {
      return false;
    }
  },

  remove(key = '') {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (_) {
      return false;
    }
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.sqliteSlotSource = window.GameModules.platform.storage.sqliteSlotSource;
