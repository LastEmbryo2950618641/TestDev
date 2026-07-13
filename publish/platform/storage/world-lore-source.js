window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.worldLoreSource = {
  get(worldTag = '') {
    return window.GameModules.sqliteSave?.getWorldLore?.(worldTag) || null;
  },

  list() {
    return window.GameModules.sqliteSave?.listWorldLores?.() || [];
  },

  save(worldTag = '', lore = null) {
    return window.GameModules.sqliteSave?.saveWorldLore?.(worldTag, lore);
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.worldLoreSource = window.GameModules.platform.storage.worldLoreSource;
