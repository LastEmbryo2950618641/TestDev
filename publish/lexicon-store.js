window.GameModules = window.GameModules || {};

window.GameModules.lexiconStore = {
  source() {
    return window.GameModules.platform?.storage?.lexiconSource
      || window.GameModules.platform?.core?.storage?.lexiconSource
      || null;
  },

  isAvailable() {
    return Boolean(this.source()?.isAvailable?.());
  },

  get(worldTag = '', kind = '', name = '') {
    return this.source()?.get?.(worldTag, kind, name) || null;
  },

  list(worldTag = '', kind = '') {
    return this.source()?.list?.(worldTag, kind) || [];
  },

  save(entry = null) {
    return this.source()?.save?.(entry);
  },

  saveMany(entries = []) {
    return this.source()?.saveMany?.(entries);
  },
};
