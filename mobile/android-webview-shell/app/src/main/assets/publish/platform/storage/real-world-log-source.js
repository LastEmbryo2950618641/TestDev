window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.realWorldLogSource = {
  append(entry = {}) {
    return window.GameModules.sqliteSave?.saveRealWorldLogEntry?.(entry);
  },

  get(id = '') {
    return window.GameModules.sqliteSave?.getRealWorldLogEntry?.(id) || null;
  },

  remove(id = '') {
    return window.GameModules.sqliteSave?.deleteRealWorldLogEntry?.(id);
  },

  list(page = 1, pageSize = 20) {
    return window.GameModules.sqliteSave?.listRealWorldLogEntries?.(page, pageSize) || [];
  },

  saveAll(entries = []) {
    return window.GameModules.sqliteSave?.saveRealWorldLogEntries?.(entries);
  },

  count() {
    return window.GameModules.sqliteSave?.countRealWorldLogEntries?.() || 0;
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.realWorldLogSource = window.GameModules.platform.storage.realWorldLogSource;
