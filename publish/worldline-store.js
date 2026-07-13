window.GameModules = window.GameModules || {};

window.GameModules.worldlineStore = {
  source() {
    return window.GameModules.platform?.storage?.worldlineSource
      || window.GameModules.platform?.core?.storage?.worldlineSource
      || null;
  },

  get(worldTag = '') {
    return this.source()?.get?.(worldTag) || null;
  },

  save(worldTag = '', worldline = null) {
    return this.source()?.save?.(worldTag, worldline);
  },
};
