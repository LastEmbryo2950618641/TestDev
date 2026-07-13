window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.lexiconSource = {
  isAvailable() {
    return Boolean(window.GameModules.sqliteSave?.db);
  },

  get(worldTag = '', kind = '', name = '') {
    return window.GameModules.sqliteSave?.getLexiconEntry?.(worldTag, kind, name) || null;
  },

  list(worldTag = '', kind = '') {
    return window.GameModules.sqliteSave?.listLexiconEntries?.(worldTag, kind) || [];
  },

  save(entry = null) {
    return window.GameModules.sqliteSave?.saveLexiconEntry?.(entry);
  },

  saveMany(entries = []) {
    return window.GameModules.sqliteSave?.saveLexiconEntries?.(entries);
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.lexiconSource = window.GameModules.platform.storage.lexiconSource;
