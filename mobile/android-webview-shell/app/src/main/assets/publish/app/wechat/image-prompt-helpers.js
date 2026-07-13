window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.imagePromptHelpers = {
  wechatMemorySections(characterId = '') {
      const memory = window.GameModules.characterMemory?.ensure?.(characterId);
      if (!memory) return { shortText: '无', longText: '无' };
      const cm = window.GameModules.characterMemory;
      const shortText = [cm.section('刚发生记忆', memory.shortTerm?.recent), cm.section('归纳总结区', memory.shortTerm?.summaryBuffer), cm.section('近发生记忆', memory.shortTerm?.summarized), cm.section('遗忘区', memory.shortTerm?.forgotten)].join('\n');
      const longText = [cm.section('难以忘记的记忆', memory.longTerm?.vivid), cm.section('不可忘记的记忆', memory.longTerm?.permanent)].join('\n');
      return { shortText, longText };
    },

  wechatWearingContext(state = {}) {
      const list = this.wearingItems?.(state) || [];
      return list.map((item) => `- ${this.wearingName?.(item) || item?.name || '未穿戴'}：${this.wearingDetail?.(item) || ''}`).join('\n') || '无当前穿戴记录';
    },

  cleanWechatImageTags(text = '') { return this.cleanWechatAlbumTags ? this.cleanWechatAlbumTags(text) : String(text || '').trim(); },

  async buildWechatImageTags(msg = {}) {
      const characterId = msg.characterId || this.wechatSelectedContact;
      const contact = this.wechatContacts?.().find((item) => item.id === characterId) || this.wechatSelected?.() || {};
      const state = this.rpgStates?.[characterId] || window.GameModules.characterStateStore?.get?.(characterId) || await this.ensureWechatUserProfile?.(contact);
      const memory = this.wechatMemorySections(characterId);
      const prompt = await window.GameModules.renderPrompt('wechat-image-prompt-collect', {
        联系人资料区: this.wechatContactProfileText(contact),
        目标状态快照: window.GameModules.promptSections.stateSnapshot(this, state),
        短期记忆区: memory.shortText,
        长期记忆区: memory.longText,
        当前穿戴区: this.wechatWearingContext(state),
        微信历史: this.wechatHistoryText(characterId),
        自拍意图: [msg.imageIntent?.reason || '', msg.imageIntent?.imageDescription || '', msg.imageIntent?.tagsHint || ''].filter(Boolean).join('\n') || '发送一张当前自拍照',
      });
      const output = await window.GameModules.aiRequest.complete({
        source: 'wechat-image-prompt-collect',
        model: this.modelId || this.settingsState?.textModelId,
        prompt,
        maxTokens: 500,
        timeoutMs: 60000,
        requireDone: true,
        ...(window.GameModules.promptSkills?.completionOptions?.('wechat-image-prompt-collect') || { jsonMode: false, outputLimitKind: 'other' }),
        tokenMeta: { title: `微信图片提示词收集｜${contact.name || '联系人'}`, category: '图片生成', summary: '根据微信联系人记忆和穿戴生成图片编辑动态标签。', kind: 'completion' },
      });
      const cleaned = this.cleanWechatImageTags(output);
      return (this.pictureGenerateSafeReplacements?.(cleaned) || cleaned).slice(0, 1000);
    },
};
