window.GameModules = window.GameModules || {};

window.GameModules.realWorldLogStore = {
  source() {
    return window.GameModules.platform?.storage?.realWorldLogSource
      || window.GameModules.platform?.core?.storage?.realWorldLogSource
      || null;
  },

  append(entry = {}) {
    return this.source()?.append?.(entry);
  },

  get(id = '') {
    return this.source()?.get?.(id) || null;
  },

  list(page = 1, pageSize = 20) {
    return this.source()?.list?.(page, pageSize) || [];
  },

  saveAll(entries = []) {
    return this.source()?.saveAll?.(entries);
  },

  count() {
    return this.source()?.count?.() || 0;
  },
};

