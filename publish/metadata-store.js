window.GameModules = window.GameModules || {};

window.GameModules.metadataStore = {
  source() {
    return window.GameModules.platform?.storage?.metadataSource
      || window.GameModules.platform?.core?.storage?.metadataSource
      || null;
  },

  isAvailable() {
    return Boolean(this.source()?.isAvailable?.());
  },

  get(key = '') {
    return this.source()?.get?.(key) ?? null;
  },

  save(key = '', value = null, options = {}) {
    return this.source()?.save?.(key, value, options);
  },
};
