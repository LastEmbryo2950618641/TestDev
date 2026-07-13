window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.worldLoreSource = {
  list() {
    return window.GameModules.sqliteSave?.listWorldLores?.() || [];
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.worldLoreSource = window.GameModules.platform.storage.worldLoreSource;
