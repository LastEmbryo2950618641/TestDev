window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.memoryDebugOrchestration = {
  debugWechatMemory(contact = this.wechatSelected?.()) {
    if (!contact || contact.group) return null;
    const characterId = this.wechatMessageKey(contact);
    const state = this.rpgStates?.[characterId] || window.GameModules.characterStateStore?.get?.(characterId);
    const messages = this.wechatMessagesByContact?.[characterId] || [];
    const memory = this.sqliteWechatMemory(characterId);
    const latestMemory = [...(memory?.shortTerm?.recent || []), ...(memory?.shortTerm?.summarized || [])].slice(-3).map((item) => item.summary || item.text);
    const worldline = this.sqliteWechatWorldline();
    const report = {
      contact: contact.name,
      characterId,
      stateFound: Boolean(state),
      messageCount: messages.length,
      lastMessages: messages.slice(-4).map((msg) => `${msg.side}:${msg.text}`),
      worldlineWechatCount: worldline.length,
      latestWorldline: worldline.slice(-3).map((event) => `${event.time || ''}:${event.detail || event.name || ''}`),
      memoryExists: Boolean(memory),
      recentCount: memory?.shortTerm?.recent?.length || 0,
      summarizedCount: memory?.shortTerm?.summarized?.length || 0,
      latestMemory,
      archiveCount: this.sqliteWechatArchiveCount(characterId),
    };
    console.log('[微信记忆检查]', report);
    return report;
  },

  sqliteWechatMemory(characterId) {
    if (!characterId || !window.GameModules.characterMemoryStore?.isAvailable?.()) return null;
    try { return window.GameModules.characterMemory?.ensure?.(characterId) || null; }
    catch (err) { console.warn('[微信记忆检查] 读取记忆失败:', err.message, err.stack); return null; }
  },

  sqliteWechatWorldline() {
    const rows = [];
    try {
      const events = window.GameModules.worldlineStore?.listEvents?.() || [];
      events.forEach((event) => {
        if (String(event.eventId || '').startsWith('wx_') || String(event.detail || '').includes('以下来自微信对话')) rows.push(event);
      });
    } catch (err) { console.warn('[微信记忆检查] 读取世界线表失败:', err.message, err.stack); }
    return rows.length ? rows : this.memoryDebugRuntimeWorldline();
  },

  memoryDebugRuntimeWorldline() {
    return (this.realWorldlineState?.events || []).filter((event) => String(event.eventId || '').startsWith('wx_') || String(event.detail || '').includes('以下来自微信对话'));
  },

  sqliteWechatArchiveCount(characterId) {
    if (!characterId) return 0;
    try { return window.GameModules.characterMemoryStore?.listArchives?.(characterId)?.length || 0; }
    catch (_) { return 0; }
  },
};
