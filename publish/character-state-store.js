window.GameModules = window.GameModules || {};

window.GameModules.characterStateStore = {
  source() {
    return window.GameModules.platform?.storage?.characterStateSource
      || window.GameModules.platform?.core?.storage?.characterStateSource
      || null;
  },

  get(id = '') {
    return this.source()?.get?.(id) || null;
  },

  getByName(name = '') {
    return this.source()?.getByName?.(name) || null;
  },

  resolve(target = '') {
    return this.source()?.resolve?.(target) || null;
  },

  list() {
    return this.source()?.list?.() || [];
  },

  save(state = null) {
    return this.source()?.save?.(state);
  },
};

