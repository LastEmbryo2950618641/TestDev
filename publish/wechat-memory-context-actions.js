window.GameModules = window.GameModules || {};

window.GameModules.wechatMemoryContextActions = {
  ensureWechatHistoryTable() {
    const db = window.GameModules.sqliteSave;
    if (!db?.db) return false;
    db.db.run('CREATE TABLE IF NOT EXISTS wechat_history(id TEXT PRIMARY KEY, contact_id TEXT NOT NULL, message_json TEXT NOT NULL, created_at TEXT NOT NULL)');
    return true;
  },

  async saveWechatHistoryRow(contactId, message) {
    const db = window.GameModules.sqliteSave;
    if (!contactId || !message || !this.ensureWechatHistoryTable()) return;
    const createdAt = this.wechatHistoryCreatedAt(message);
    const id = `${contactId}_${createdAt}_${String(message.side || '').slice(0, 1)}_${window.GameModules.rpgState?.seed?.(message.text || message.imageRecord || createdAt) || Date.now()}`;
    db.db.run('INSERT OR REPLACE INTO wechat_history(id,contact_id,message_json,created_at) VALUES (?,?,?,?)', [id, contactId, JSON.stringify(message), createdAt]);
    await db.persist();
  },

  wechatHistoryCreatedAt(message = {}) {
    if (typeof message.time === 'string' && message.time.trim()) return message.time;
    const t = message.time || {};
    if (Number(t.year) && Number(t.month) && Number(t.day)) {
      const pad = (n) => String(Number(n) || 0).padStart(2, '0');
      return `${Number(t.year)}-${pad(t.month)}-${pad(t.day)}T${pad(t.hour)}:${pad(t.minute)}:${pad(t.second)}`;
    }
    return String(message.atDisplay || message.at || new Date().toISOString());
  },

  listWechatHistoryRows(contactId, limit = 12) {
    const db = window.GameModules.sqliteSave;
    if (!contactId || !this.ensureWechatHistoryTable()) return [];
    const rows = [];
    const stmt = db.db.prepare('SELECT message_json FROM wechat_history WHERE contact_id=? ORDER BY created_at DESC LIMIT ?');
    stmt.bind([contactId, limit]);
    while (stmt.step()) {
      try { rows.push(JSON.parse(stmt.getAsObject().message_json)); }
      catch (_) { /* 忽略坏行 */ }
    }
    stmt.free();
    return rows.reverse();
  },

  wechatHistoryQueryText(contactId, limit = 12) {
    const list = this.listWechatHistoryRows(contactId, limit);
    const fallback = this.wechatMessagesByContact?.[contactId] || [];
    const source = list.length ? list : fallback.slice(-limit);
    if (!source.length) return '暂无历史消息。';
    return source.map((msg) => msg.imageRecord || `${msg.side === 'self' ? '玩家' : '联系人'}：${msg.text}`).join('\n');
  },

  wechatHistoryText(id) { return this.wechatHistoryQueryText(id, 12); },

  wechatMemoryContext(characterId, playerText = '') {
    const full = this.getCharacterMemory?.(characterId) || '暂无人物记忆。';
    const query = this.memoryQueryContext?.(characterId, playerText) || '暂无关键词记忆。';
    return [`## 联系人短期与长期记忆\n${full}`, `## 本次消息相关记忆\n${query}`].join('\n\n').slice(0, 4200);
  },

  validateWechatHistoryDecision(raw = {}) {
    return { needHistory: !!raw.needHistory, limit: Math.max(3, Math.min(20, Math.round(Number(raw.limit) || 8))), reason: String(raw.reason || '本次微信回复上下文判断').slice(0, 120) };
  },

  async wechatHistoryContextForReply(contactId, playerText = '', memoryContext = '') {
    const hint = this.wechatHistoryQueryHint(contactId);
    if (!window.dzmm?.completions) return hint;
    const prompt = [
      '你负责判断微信联系人回复是否需要读取固定微信历史表原文。只返回一行合法 JSON。',
      '默认已经提供联系人短期记忆、长期记忆和本次相关记忆；只有玩家要求核对上一条原话、具体聊天措辞、图片消息、承诺原文、聊天顺序或记忆明显不足时，needHistory 才为 true。',
      '返回格式：{"needHistory":false,"limit":8,"reason":"判断原因"}',
      `联系人ID：${contactId}`,
      `玩家新消息：${playerText}`,
      `已提供记忆上下文：\n${String(memoryContext || '').slice(0, 2600)}`,
    ].join('\n\n');
    try {
      const decision = await window.GameModules.jsonUtils.generateJsonWithRetry({
        source: 'wechat-history-decision', model: this.modelId || this.settingsState?.textModelId, timeoutMs: 30000, prompt, format: prompt, max: 2,
        parse: (text) => window.GameModules.jsonUtils.parseLoose(text),
        validate: (raw) => this.validateWechatHistoryDecision(raw),
      });
      if (!decision.needHistory) return [hint, `AI判断：本次不需要读取微信原文。原因：${decision.reason}`].join('\n');
      return [hint, `## 本次按需查询微信历史\n查询原因：${decision.reason}\n${this.wechatHistoryQueryText(contactId, decision.limit)}`].join('\n\n').slice(0, 3200);
    } catch (err) {
      console.warn('[微信] 历史按需判断失败，继续使用记忆上下文:', err.code, err.message, err.stack);
      return hint;
    }
  },

  wechatHistoryQueryHint(characterId) {
    return [
      '微信历史已存入固定表 wechat_history，默认不全文载入。',
      `如本次消息需要核对微信原文、上一条话术、具体聊天措辞或图片消息，可查询当前联系人 contact_id=${characterId} 的微信历史。`,
      '当前未查询时，不要把缺失的微信原文当作已知事实；优先依据短期记忆、长期记忆和本次相关记忆回复。',
    ].join('\n');
  },
};
