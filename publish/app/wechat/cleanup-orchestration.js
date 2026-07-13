window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.cleanupOrchestration = {
  version: 'clear-old-wechat-records-v2',

  run(store) {
    const metadataStore = window.GameModules.metadataStore;
    const memoryStore = window.GameModules.characterMemoryMaintenanceStore;
    if (!metadataStore?.isAvailable?.() || !memoryStore?.isAvailable?.() || metadataStore.get?.(this.version)) return false;
    let changed = this.cleanWorldline(store);
    changed = this.cleanMemories(memoryStore) || changed;
    metadataStore.save(this.version, { cleanedAt: new Date().toISOString(), changed }).catch((err) => console.warn('[微信清理] 标记迁移失败:', err.message, err.stack));
    if (changed) window.GameModules.storage.put(window.GameModules.storage.snapshot(store)).catch((err) => console.warn('[微信清理] 保存清理结果失败:', err.message, err.stack));
    return changed;
  },

  isOldWechatText(text = '') {
    return /来源：微信玩家发送：|联系人回复：|联系人语气：|微信时间：/.test(String(text || ''));
  },

  cleanWorldline(store) {
    const state = store.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    const events = state.events || [];
    const nextEvents = events.filter((event) => !(String(event.eventId || '').startsWith('wx_') || this.isOldWechatText(event.detail)));
    const changed = nextEvents.length !== events.length;
    if (changed) store.realWorldlineState = { ...state, events: nextEvents };
    return changed;
  },

  cleanMemories(memoryStore) {
    let changed = false;
    memoryStore.listMemories().forEach(({ characterId, memory }) => {
      const next = this.cleanMemoryObject(memory);
      if (!next.changed) return;
      memoryStore.replaceMemory(characterId, next.memory);
      changed = true;
    });
    const archiveIds = memoryStore.listArchives().filter((row) => this.isOldWechatText(row.text)).map((row) => row.id);
    archiveIds.forEach((id) => memoryStore.removeArchive(id));
    return archiveIds.length > 0 || changed;
  },

  cleanMemoryObject(memory) {
    const sections = ['recent', 'summaryBuffer', 'summarized', 'forgotten'];
    let changed = false;
    const shortTerm = { ...(memory.shortTerm || {}) };
    sections.forEach((key) => {
      const list = shortTerm[key] || [];
      const next = list.filter((item) => !this.isOldWechatText(item.text) && !this.isOldWechatText(item.summary));
      if (next.length !== list.length) changed = true;
      shortTerm[key] = next;
    });
    const longTerm = { ...(memory.longTerm || {}) };
    ['vivid', 'permanent'].forEach((key) => {
      const list = longTerm[key] || [];
      const next = list.filter((item) => !this.isOldWechatText(item.text) && !this.isOldWechatText(item.summary));
      if (next.length !== list.length) changed = true;
      longTerm[key] = next;
    });
    return { changed, memory: { ...memory, shortTerm, longTerm, updatedAt: changed ? new Date().toISOString() : memory.updatedAt } };
  },
};
