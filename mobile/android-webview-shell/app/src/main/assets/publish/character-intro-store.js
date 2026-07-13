window.GameModules = window.GameModules || {};

window.GameModules.characterIntroStore = {
  source() {
    return window.GameModules.platform?.storage?.characterIntroSource
      || window.GameModules.platform?.core?.storage?.characterIntroSource
      || null;
  },

  get(name = '', worldTag = '') {
    return this.source()?.get?.(name, worldTag) || null;
  },

  list() {
    return this.source()?.list?.() || [];
  },

  save(card = null) {
    return this.source()?.save?.(card);
  },
};
