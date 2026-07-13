window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.worldlineSource = {
  get(worldTag = '') {
    return window.GameModules.sqliteSave?.getWorldline?.(worldTag) || null;
  },

  save(worldTag = '', worldline = null) {
    return window.GameModules.sqliteSave?.saveWorldline?.(worldTag, worldline);
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.worldlineSource = window.GameModules.platform.storage.worldlineSource;
