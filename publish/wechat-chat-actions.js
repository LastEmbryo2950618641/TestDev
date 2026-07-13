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

const wechatChatOrchestrationForwarders = {
  sendWechatMessage: 'sendWechatMessage',
  replyWechatContact: 'replyWechatContact',
  generateWechatReply: 'generateWechatReply',
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

function callWechatChatOrchestration(name, context, ...args) {
  return window.GameModules.app.wechat.chatOrchestration[name].call(context, ...args);
}

window.GameModules.wechatChatActions = {
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

Object.entries(wechatChatOrchestrationForwarders).forEach(([name, helperName]) => {
  window.GameModules.wechatChatActions[name] = function wechatChatOrchestrationFacade(...args) {
    return callWechatChatOrchestration(helperName, this, ...args);
  };
});
