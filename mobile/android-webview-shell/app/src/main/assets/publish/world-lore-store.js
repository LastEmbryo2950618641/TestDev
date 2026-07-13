window.GameModules = window.GameModules || {};

window.GameModules.worldLoreStore = {
  source() {
    return window.GameModules.platform?.storage?.worldLoreSource
      || window.GameModules.platform?.core?.storage?.worldLoreSource
      || null;
  },

  get(worldTag = '') {
    return this.source()?.get?.(worldTag) || null;
  },

  list() {
    return this.source()?.list?.() || [];
  },

  save(worldTag = '', lore = null) {
    return this.source()?.save?.(worldTag, lore);
  },
};
