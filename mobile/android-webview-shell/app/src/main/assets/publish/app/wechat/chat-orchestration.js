window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.chatOrchestration = {
  async sendWechatMessage() {
    const text = String(this.wechatInput || '').trim();
    const target = this.wechatSelected();
    if (!text || this.wechatSending || !target) return;
    this.wechatError = '';
    this.wechatInput = '';
    this.wechatMentionPanelOpen = false;
    this.appendWechatMessage(this.wechatMessageKey(target), { side: 'self', name: this.playerDisplayCharacter?.().name || this.playerName || '我', mark: '我', text });
    if (target.group) await this.recordWechatWorldline(target, text, '');
    await this.save?.();
    if (target.group) return;
    await this.replyWechatContact(target, text);
  },

  async replyWechatContact(contact, playerText) {
    this.wechatSending = true;
    const reqId = (this.wechatReplyRequestId || 0) + 1;
    this.wechatReplyRequestId = reqId;
    try {
      const result = await this.generateWechatReply(contact, playerText);
      if (reqId !== this.wechatReplyRequestId) return;
      const characterId = contact.id;
      const state = this.rpgStates?.[characterId] || window.GameModules.characterStateStore?.get?.(characterId) || await this.ensureWechatUserProfile?.(contact);
      result.characterCardChanges = await window.GameModules.characterCardLexicon?.applyToState?.(state, result.lexiconUpdates || []) || [];
      await this.applyMetricUpdatesToState?.(state, result.metricUpdates);
      await this.applyInventoryUpdatesToState?.(state, result.lexiconUpdates || []);
      this.advancePhoneTime?.(result.elapsedSeconds || 60);
      this.appendWechatMessage(characterId, { side: 'other', name: state?.profile?.name || contact.name, mark: (state?.profile?.name || contact.name || '').slice(0, 1), text: result.reply, characterId, metricUpdates: result.metricUpdates, lexiconUpdates: result.lexiconUpdates, characterCardChanges: result.characterCardChanges, cardChangesOpen: false, changeReasonsOpen: false });
      if (result.imageIntent?.offer) await this.appendWechatPendingImageMessage(characterId, state, contact, { ...result.imageIntent, impression: result.impression });
      await window.GameModules.characterMemory?.recordWechatExchange?.(this, { ...contact, id: characterId, characterId }, playerText, result.reply, result);
      window.GameModules.factionArchive?.recordWechat?.(this, { ...contact, id: characterId, characterId }, playerText, result.reply, result);
      await this.recordWechatWorldline({ ...contact, id: characterId, characterId }, playerText, result.reply, result);
      this.debugWechatMemory?.({ ...contact, id: characterId, characterId });
      window.GameModules.wechatOutreachContext?.closeOutreach?.(this, { ...contact, id: characterId, characterId: state?.id || contact.characterId || characterId });
      await this.save?.();
    } catch (err) {
      if (reqId !== this.wechatReplyRequestId) return;
      console.error('[微信] 联系人回复生成失败:', err.code, err.message, err.stack);
      this.wechatError = err.message || '联系人暂时没有回复';
      const fallback = '我这边刚刚有点卡，等下再说。';
      const characterId = contact.id;
      const state = this.rpgStates?.[characterId] || window.GameModules.characterStateStore?.get?.(characterId);
      this.advancePhoneTime?.(60);
      this.appendWechatMessage(characterId, { side: 'other', name: state?.profile?.name || contact.name, mark: (state?.profile?.name || contact.name || contact.mark || '').slice(0, 1), text: fallback, characterId });
      await window.GameModules.characterMemory?.recordWechatExchange?.(this, { ...contact, id: characterId, characterId }, playerText, fallback, { mood: '通讯异常' });
      window.GameModules.factionArchive?.recordWechat?.(this, { ...contact, id: characterId, characterId }, playerText, fallback, { mood: '通讯异常' });
      await this.recordWechatWorldline({ ...contact, id: characterId, characterId }, playerText, fallback, { mood: '通讯异常' });
      window.GameModules.wechatOutreachContext?.closeOutreach?.(this, { ...contact, id: characterId });
      await this.save?.();
    } finally {
      if (reqId === this.wechatReplyRequestId) this.wechatSending = false;
    }
  },

  async generateWechatReply(contact, playerText) {
    if (!window.dzmm?.completions) return { reply: this.fallbackWechatReply(contact, playerText), elapsedSeconds: 60, impression: 20 };
    try { await this.ensureWechatUserProfile?.(contact); }
    catch (err) { console.warn('[微信] 回复前资料补全失败，继续用现有资料:', err.code, err.message, err.stack); }
    const prompt = await this.wechatReplyPrompt(contact, playerText);
    const result = await window.GameModules.jsonUtils.generateJsonWithRetry({
      source: 'wechat-chat-reply', promptId: 'wechat-chat-reply', model: this.modelId || this.settingsState?.textModelId, timeoutMs: 60000, prompt, format: prompt, max: 2,
      parse: (text) => window.GameModules.jsonUtils.parseLoose(text),
      validate: (raw) => this.validateWechatReply(raw, contact),
    });
    return this.attachWechatMentionedImageIntent?.(result, playerText, this.wechatMessageKey(contact)) || result;
  },
};
