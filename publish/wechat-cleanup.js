window.GameModules = window.GameModules || {};

window.GameModules.wechatCleanup = {
  version: 'clear-old-wechat-records-v1',

  run(store) {
    const save = window.GameModules.sqliteSave;
    if (!save?.db || save.getMetaJson?.(this.version)) return false;
    let changed = this.cleanWorldline(store);
    changed = this.cleanMemories(save) || changed;
    save.saveMetaJson(this.version, { cleanedAt: new Date().toISOString(), changed }).catch((err) => console.warn('[微信清理] 标记迁移失败:', err.message, err.stack));
    if (changed) window.GameModules.storage.put(window.GameModules.storage.snapshot(store)).catch((err) => console.warn('[微信清理] 保存清理结果失败:', err.message, err.stack));
    return changed;
  },

  isOldWechatText(text = '') {
    return /来源：微信|玩家发送：|联系人回复：|联系人语气：|微信时间：/.test(String(text || ''));
  },

  cleanWorldline(store) {
    const state = store.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    const events = state.events || [];
    const nextEvents = events.filter((event) => !(String(event.eventId || '').startsWith('wx_') || this.isOldWechatText(event.detail)));
    const changed = nextEvents.length !== events.length;
    if (changed) store.realWorldlineState = { ...state, events: nextEvents };
    return changed;
  },

  cleanMemories(save) {
    let changed = false;
    const stmt = save.db.prepare('SELECT character_id,memory_json FROM character_memory');
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    rows.forEach((row) => {
      const memory = JSON.parse(row.memory_json);
      const next = this.cleanMemoryObject(memory);
      if (!next.changed) return;
      save.db.run('INSERT OR REPLACE INTO character_memory(character_id,memory_json,updated_at) VALUES (?,?,?)', [row.character_id, JSON.stringify(next.memory), new Date().toISOString()]);
      changed = true;
    });
    const archive = save.db.prepare('SELECT id,text FROM memory_archive');
    const archiveIds = [];
    while (archive.step()) {
      const row = archive.getAsObject();
      if (this.isOldWechatText(row.text)) archiveIds.push(row.id);
    }
    archive.free();
    archiveIds.forEach((id) => save.db.run('DELETE FROM memory_archive WHERE id=?', [id]));
    return archiveIds.length > 0 || changed;
  },

  cleanMemoryObject(memory) {
    const sections = ['recent', 'summaryBuffer', 'summarized', 'forgotten'];
    let changed = false;
    const shortTerm = { ...(memory.shortTerm || {}) };
    sections.forEach((key) => {
      const list = shortTerm[key] || [];
      const next = list.filter((item) => item.source !== 'wechat' && !this.isOldWechatText(item.text) && !this.isOldWechatText(item.summary));
      if (next.length !== list.length) changed = true;
      shortTerm[key] = next;
    });
    const longTerm = { ...(memory.longTerm || {}) };
    ['vivid', 'permanent'].forEach((key) => {
      const list = longTerm[key] || [];
      const next = list.filter((item) => item.source !== 'wechat' && !this.isOldWechatText(item.text) && !this.isOldWechatText(item.summary));
      if (next.length !== list.length) changed = true;
      longTerm[key] = next;
    });
    return { changed, memory: { ...memory, shortTerm, longTerm, updatedAt: changed ? new Date().toISOString() : memory.updatedAt } };
  },
};
