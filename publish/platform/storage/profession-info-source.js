window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.professionInfoSource = {
  get(worldTag = '', name = '') {
    return window.GameModules.sqliteSave?.getProfessionInfo?.(worldTag, name) || null;
  },

  save(worldTag = '', info = null) {
    return window.GameModules.sqliteSave?.saveProfessionInfo?.(worldTag, info);
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.professionInfoSource = window.GameModules.platform.storage.professionInfoSource;
