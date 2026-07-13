window.GameModules = window.GameModules || {};

window.GameModules.wechatHistoryStore = {
  source() {
    return window.GameModules.platform?.storage?.wechatHistorySource
      || window.GameModules.platform?.core?.storage?.wechatHistorySource
      || null;
  },

  ensure() {
    return this.source()?.ensure?.() || false;
  },

  append(entry = {}) {
    return this.source()?.append?.(entry);
  },

  list(contactId = '', limit = 12) {
    return this.source()?.list?.(contactId, limit) || [];
  },

  listRecent(contactId = '', limit = 300) {
    return this.source()?.listRecent?.(contactId, limit) || [];
  },
};
