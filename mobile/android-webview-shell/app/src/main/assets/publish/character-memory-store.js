window.GameModules = window.GameModules || {};

window.GameModules.characterMemoryStore = {
  source() {
    return window.GameModules.platform?.storage?.characterMemorySource
      || window.GameModules.platform?.core?.storage?.characterMemorySource
      || null;
  },

  isAvailable() {
    return Boolean(this.source()?.isAvailable?.());
  },

  get(characterId = '') {
    return this.source()?.get?.(characterId) || null;
  },

  save(characterId = '', memory = null) {
    return this.source()?.save?.(characterId, memory);
  },

  listArchives(characterId = '') {
    return this.source()?.listArchives?.(characterId) || [];
  },

  saveArchive(characterId = '', item = null) {
    return this.source()?.saveArchive?.(characterId, item);
  },
};
