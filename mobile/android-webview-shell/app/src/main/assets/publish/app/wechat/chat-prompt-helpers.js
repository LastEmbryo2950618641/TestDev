window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.chatPromptHelpers = {
  isWechatPastEventQuestion(text = '') {
    return /几天前|之前|上次|刚才|昨天|那次|还记得|记不记得|记得吗|承诺|照片|图片|以前|发生过|当时|原来|旧/.test(String(text || ''));
  },

  wechatPastEventContext(contact, playerText = '', state = null) {
    if (!this.isWechatPastEventQuestion(playerText)) return '本次消息不是过去事件追问，未触发统一过去事件查询。';
    const characterId = this.wechatMessageKey(contact);
    const profile = state?.profile || {};
    return window.GameModules.pastEventQuery?.query?.(this, 'searchPastEvent', {
      question: playerText,
      contactId: characterId,
      characterId,
      characterName: profile.name || contact?.name || '',
      worldTag: window.GameModules.realWorld2026?.label || '2026 现代都市现实世界',
      maxChars: 5200,
    }) || '过去事件查询不可用。';
  },

  async wechatReplyPrompt(contact, playerText) {
    const sections = window.GameModules.promptSections;
    const player = sections.playerProfile(this);
    const stateSkill = await window.GameModules.skillLoader?.instruction?.('emotion.feeling.wearing.assess') || '', imageSkill = await window.GameModules.skillLoader?.instruction?.('image.edit.call') || '', memorySkill = await window.GameModules.skillLoader?.instruction?.('memory.query') || '';
    const characterId = this.wechatMessageKey(contact);
    const state = this.rpgStates?.[characterId] || window.GameModules.characterStateStore?.get?.(characterId);
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
      过去事件查询结果: this.wechatPastEventContext(contact, playerText, state),
      玩家消息: playerText,
      状态判定Skill: stateSkill,
      图片编辑Skill: imageSkill,
      记忆查询Skill: memorySkill,
    });
  },
};
