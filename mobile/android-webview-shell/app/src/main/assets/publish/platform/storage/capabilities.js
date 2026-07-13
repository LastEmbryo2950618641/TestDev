window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.capabilities = {
  isReady() {
    const sqliteSave = window.GameModules.sqliteSave;
    const backend = window.GameModules.platform?.storage?.backend;
    return Boolean(
      backend
      && typeof backend.open === 'function'
      && typeof backend.put === 'function'
      && typeof backend.get === 'function'
      && (sqliteSave?.db || sqliteSave?.fallback || window.GameModules.platform?.core?.storage?.sqliteSlotSource)
    );
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.capabilities = window.GameModules.platform.storage.capabilities;
