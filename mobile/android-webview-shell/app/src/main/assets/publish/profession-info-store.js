window.GameModules = window.GameModules || {};

window.GameModules.professionInfoStore = {
  source() {
    return window.GameModules.platform?.storage?.professionInfoSource
      || window.GameModules.platform?.core?.storage?.professionInfoSource
      || null;
  },

  get(worldTag = '', name = '') {
    return this.source()?.get?.(worldTag, name) || null;
  },

  save(worldTag = '', info = null) {
    return this.source()?.save?.(worldTag, info);
  },
};
