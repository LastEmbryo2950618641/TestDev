window.GameModules = window.GameModules || {};
window.GameModules.wechatAlbumPromptListActions = {
  wechatAlbumPromptList(contact = this.wechatProfileContact()) {
    return (this.wechatAlbumPrompts?.[contact?.id || 'player-self'] || []).filter((item) => item?.prompt);
  },

  wechatAlbumSelectedPrompt() {
    return this.wechatAlbumPromptList().find((item) => item.id === this.wechatAlbumPromptSelectedId) || null;
  },

  async generateWechatAlbumPromptOnly() {
    if (this.wechatAlbumGenerating) return;
    const contact = this.wechatProfileContact();
    const kind = this.wechatAlbumPromptDraft?.kind || 'natural';
    const reqId = (this.wechatAlbumRequestId || 0) + 1;
    this.wechatAlbumRequestId = reqId;
    this.wechatAlbumGenerating = true;
    try {
      await this.ensureWechatUserProfile?.(contact);
      const built = await this.buildWechatAlbumDrawPrompt(contact, kind, this.wechatAlbumPromptDraft);
      if (reqId !== this.wechatAlbumRequestId) return;
      const item = { id: `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, prompt: built.prompt, negativePrompt: built.negativePrompt, raw: built.raw || '', createdAt: new Date().toISOString() };
      const list = this.wechatAlbumPromptList(contact);
      this.wechatAlbumPrompts = { ...(this.wechatAlbumPrompts || {}), [contact.id]: [item, ...list].slice(0, 30) };
      this.wechatAlbumPromptSelectedId = item.id;
      this.wechatAlbumPromptEditText = item.prompt;
      this.wechatAlbumPromptEditNegative = item.negativePrompt;
      this.wechatAlbumPromptStep = 'prompt-list';
      await this.save?.();
    } catch (err) {
      console.error('[微信相册] 绘图提示词生成失败:', err.code, err.message, err.stack);
      this.wechatError = err?.message || '绘图提示词生成失败，请稍后重试。';
    } finally {
      if (reqId === this.wechatAlbumRequestId) this.wechatAlbumGenerating = false;
    }
  },

  openWechatAlbumPromptList() { this.wechatAlbumPromptStep = 'prompt-list'; },

  selectWechatAlbumPrompt(id) {
    this.wechatAlbumPromptSelectedId = id;
    const item = this.wechatAlbumSelectedPrompt();
    this.wechatAlbumPromptEditText = item?.prompt || '';
    this.wechatAlbumPromptEditNegative = item?.negativePrompt || '';
    this.wechatAlbumPromptStep = 'prompt-detail';
  },
};
