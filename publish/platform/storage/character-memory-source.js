window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.characterMemorySource = {
  isAvailable() {
    return Boolean(window.GameModules.sqliteSave?.db);
  },

  get(characterId = '') {
    return window.GameModules.sqliteSave?.getCharacterMemory?.(characterId) || null;
  },

  save(characterId = '', memory = null) {
    return window.GameModules.sqliteSave?.saveCharacterMemory?.(characterId, memory);
  },

  listArchives(characterId = '') {
    return window.GameModules.sqliteSave?.listMemoryArchives?.(characterId) || [];
  },

  saveArchive(characterId = '', item = null) {
    return window.GameModules.sqliteSave?.saveMemoryArchive?.(characterId, item);
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.characterMemorySource = window.GameModules.platform.storage.characterMemorySource;
