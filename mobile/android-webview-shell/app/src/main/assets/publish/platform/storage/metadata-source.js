window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.metadataSource = {
  isAvailable() {
    return Boolean(window.GameModules.sqliteSave?.db);
  },

  get(key = '') {
    return window.GameModules.sqliteSave?.getMetaJson?.(key) ?? null;
  },

  save(key = '', value = null) {
    return window.GameModules.sqliteSave?.saveMetaJson?.(key, value);
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.metadataSource = window.GameModules.platform.storage.metadataSource;
