window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.characterMemoryMaintenanceSource = {
  isAvailable() {
    return Boolean(window.GameModules.sqliteSave?.db);
  },

  listMemories() {
    return window.GameModules.sqliteSave?.listCharacterMemories?.() || [];
  },

  replaceMemory(characterId = '', memory = null) {
    return window.GameModules.sqliteSave?.replaceCharacterMemory?.(characterId, memory);
  },

  listArchives() {
    return window.GameModules.sqliteSave?.listAllMemoryArchives?.() || [];
  },

  removeArchive(id = '') {
    return window.GameModules.sqliteSave?.deleteMemoryArchive?.(id);
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.characterMemoryMaintenanceSource = window.GameModules.platform.storage.characterMemoryMaintenanceSource;
