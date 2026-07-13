window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.backend = {
  async open(slot, options = {}) {
    await window.GameModules.sqliteSave.open(slot, options);
  },

  async put(value) {
    await window.GameModules.sqliteSave.saveGameState(value);
  },

  async get() {
    return window.GameModules.sqliteSave.loadGameState();
  },

  async remove(slot) {
    await window.GameModules.sqliteSave.deleteSlot(slot || window.GameModules.sqliteSave.activeSlot);
  },

  async inspectSlot(slot) {
    return window.GameModules.sqliteSave.inspectSlot(slot);
  },

  listCharacterStates() {
    return window.GameModules.sqliteSave.listCharacterStates();
  },

  async readRaw(slot) {
    return window.GameModules.sqliteSave.readRaw(slot);
  },

  async writeRaw(slot, raw) {
    return window.GameModules.sqliteSave.writeRaw(slot, raw);
  },

  async persist() {
    return window.GameModules.sqliteSave.persist();
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.backend = window.GameModules.platform.storage.backend;
