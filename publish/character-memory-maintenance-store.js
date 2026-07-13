window.GameModules = window.GameModules || {};

window.GameModules.characterMemoryMaintenanceStore = {
  source() {
    return window.GameModules.platform?.storage?.characterMemoryMaintenanceSource
      || window.GameModules.platform?.core?.storage?.characterMemoryMaintenanceSource
      || null;
  },

  isAvailable() {
    return Boolean(this.source()?.isAvailable?.());
  },

  listMemories() {
    return this.source()?.listMemories?.() || [];
  },

  replaceMemory(characterId = '', memory = null) {
    return this.source()?.replaceMemory?.(characterId, memory);
  },

  listArchives() {
    return this.source()?.listArchives?.() || [];
  },

  removeArchive(id = '') {
    return this.source()?.removeArchive?.(id);
  },
};
