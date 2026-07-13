window.GameModules = window.GameModules || {};

const wechatChatSessionForwarders = {
  selectWechatContact: 'selectContact',
  wechatMessageKey: 'messageKey',
  wechatMessages: 'messages',
  updateWechatLatest: 'updateLatest',
};

const wechatChatMessageForwarders = {
  appendWechatMessage: 'appendWechatMessage',
  wechatMessageTime: 'wechatMessageTime',
  wechatMemoryTime: 'wechatMemoryTime',
  wechatDialogueTimeLabel: 'wechatDialogueTimeLabel',
  formatWechatDialogueLog: 'formatWechatDialogueLog',
  wechatTimeValue: 'wechatTimeValue',
  wechatTimeDisplay: 'wechatTimeDisplay',
};

const wechatChatReplyForwarders = {
  wechatContactProfileText: 'wechatContactProfileText',
  validateWechatReply: 'validateWechatReply',
  fallbackWechatReply: 'fallbackWechatReply',
};

function callWechatChatSession(name, context, ...args) {
  return window.GameModules.app.wechat.chatSession[name].call(context, ...args);
}

function callWechatChatMessageHelper(name, context, ...args) {
  return window.GameModules.app.wechat.chatMessageHelpers[name].call(context, ...args);
}

function callWechatChatReplyHelper(name, context, ...args) {
  return window.GameModules.app.wechat.chatReplyHelpers[name].call(context, ...args);
}

window.GameModules.wechatChatActions = {
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
      const state = this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId) || await this.ensureWechatUserProfile?.(contact);
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
      await this.save?.();
    } catch (err) {
      if (reqId !== this.wechatReplyRequestId) return;
      console.error('[微信] 联系人回复生成失败:', err.code, err.message, err.stack);
      this.wechatError = err.message || '联系人暂时没有回复';
      const fallback = '我这边刚刚有点卡，等下再说。';
      const characterId = contact.id;
      const state = this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId);
      this.advancePhoneTime?.(60);
      this.appendWechatMessage(characterId, { side: 'other', name: state?.profile?.name || contact.name, mark: (state?.profile?.name || contact.name || contact.mark || '').slice(0, 1), text: fallback, characterId });
      await window.GameModules.characterMemory?.recordWechatExchange?.(this, { ...contact, id: characterId, characterId }, playerText, fallback, { mood: '通讯异常' });
      window.GameModules.factionArchive?.recordWechat?.(this, { ...contact, id: characterId, characterId }, playerText, fallback, { mood: '通讯异常' });
      await this.recordWechatWorldline({ ...contact, id: characterId, characterId }, playerText, fallback, { mood: '通讯异常' });
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

  async wechatReplyPrompt(contact, playerText) {
    const sections = window.GameModules.promptSections;
    const player = sections.playerProfile(this);
    const stateSkill = await window.GameModules.skillLoader?.instruction?.('emotion.feeling.wearing.assess') || '', imageSkill = await window.GameModules.skillLoader?.instruction?.('image.edit.call') || '', memorySkill = await window.GameModules.skillLoader?.instruction?.('memory.query') || '';
    const characterId = this.wechatMessageKey(contact);
    const state = this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId);
    const archive = await this.searchMemoryArchive?.(characterId, playerText) || '无';
    const memoryContext = this.wechatMemoryContext?.(characterId, playerText) || this.memoryQueryContext?.(characterId, playerText) || '暂无人物记忆。';
    const historyContext = await this.wechatHistoryContextForReply?.(characterId, playerText, memoryContext) || this.wechatHistoryQueryHint?.(characterId) || '微信历史默认不载入；需要核对原文时再查询固定历史表。';
    return window.GameModules.renderPrompt('wechat-chat-reply', {
      玩家基础资料区: player.playerBasic,
      玩家现实身份区: player.playerIdentity,
      玩家居住家庭区: player.playerHome,
      玩家人际关系区: player.playerRelations,
      玩家备注区: player.playerNotes,
      联系人资料区: this.wechatContactProfileText(contact, playerText),
      手机时间: `${this.phoneDateText?.() || '未知'} ${this.phoneTimeText?.() || ''}`,
      现实场景: this.realWorldSceneTitle || '现实世界',
      现实地点: this.realWorldLocationName || '未确认',
      现实状态: this.realWorldStatus || '现实稳定',
      目标状态快照: sections.stateSnapshot(this, state),
      微信历史: historyContext,
      提及上下文: this.wechatMentionContextText?.(playerText, characterId) || '无',
      记忆查询结果: [memoryContext, `## 记忆归档\n${archive}`].join('\n\n'),
      玩家消息: playerText,
      状态判定Skill: stateSkill,
      图片编辑Skill: imageSkill,
      记忆查询Skill: memorySkill,
    });
  },

};

Object.entries(wechatChatSessionForwarders).forEach(([name, helperName]) => {
  window.GameModules.wechatChatActions[name] = function wechatChatSessionFacade(...args) {
    return callWechatChatSession(helperName, this, ...args);
  };
});

Object.entries(wechatChatMessageForwarders).forEach(([name, helperName]) => {
  window.GameModules.wechatChatActions[name] = function wechatChatMessageFacade(...args) {
    return callWechatChatMessageHelper(helperName, this, ...args);
  };
});

Object.entries(wechatChatReplyForwarders).forEach(([name, helperName]) => {
  window.GameModules.wechatChatActions[name] = function wechatChatReplyFacade(...args) {
    return callWechatChatReplyHelper(helperName, this, ...args);
  };
});
