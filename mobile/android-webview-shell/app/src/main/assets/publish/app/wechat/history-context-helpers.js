window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.historyContextHelpers = {
  ensureWechatHistoryTable() {
    return window.GameModules.wechatHistoryStore?.ensure?.() || false;
  },

  async saveWechatHistoryRow(contactId, message) {
    if (!contactId || !message) return;
    const createdAt = this.wechatHistoryCreatedAt(message);
    const id = `${contactId}_${createdAt}_${String(message.side || '').slice(0, 1)}_${window.GameModules.rpgState?.seed?.(message.text || message.imageRecord || createdAt) || Date.now()}`;
    await window.GameModules.wechatHistoryStore?.append?.({ id, contactId, message, createdAt });
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
    if (!contactId) return [];
    return window.GameModules.wechatHistoryStore?.list?.(contactId, limit) || [];
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
    const prompt = await window.GameModules.renderPrompt('wechat-history-decision', {
      contactId,
      playerText,
      memoryContext: String(memoryContext || '').slice(0, 2600),
    });
    try {
      const decision = await window.GameModules.jsonUtils.generateJsonWithRetry({
        source: 'wechat-history-decision', promptId: 'wechat-history-decision', model: this.modelId || this.settingsState?.textModelId, timeoutMs: 30000, prompt, format: prompt, max: 2,
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
