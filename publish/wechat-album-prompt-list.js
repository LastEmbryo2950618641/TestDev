window.GameModules = window.GameModules || {};
window.GameModules.wechatAlbumPromptListActions = {
  wechatAlbumPromptList(...args) { return window.GameModules.app.wechat.albumPromptListHelpers.wechatAlbumPromptList.call(this, ...args); },

  wechatAlbumSelectedPrompt(...args) { return window.GameModules.app.wechat.albumPromptListHelpers.wechatAlbumSelectedPrompt.call(this, ...args); },

  wechatAlbumPromptListPreview(...args) { return window.GameModules.app.wechat.albumPromptListHelpers.wechatAlbumPromptListPreview.call(this, ...args); },
  async generateWechatAlbumPromptOnly() {
    if (this.wechatAlbumGenerating) return;
    const contact = this.wechatProfileContact();
    const kind = this.wechatAlbumPromptDraft?.kind || 'natural';
    const reqId = (this.wechatAlbumRequestId || 0) + 1;
    this.wechatAlbumRequestId = reqId;
    this.wechatAlbumGenerating = true;
    this.wechatAlbumPromptError = '';
    try {
      await this.ensureWechatUserProfile?.(contact);
      const built = await this.buildWechatAlbumDrawPrompt(contact, kind, this.wechatAlbumPromptDraft);
      if (reqId !== this.wechatAlbumRequestId) return;
      const prompt = this.normalizeWechatAlbumPromptFixedTags?.(built.prompt, kind, contact) || built.prompt;
      const item = { id: `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, prompt, negativePrompt: built.negativePrompt, raw: built.raw || '', createdAt: new Date().toISOString() };
      const list = this.wechatAlbumPromptList(contact);
      this.wechatAlbumPrompts = { ...(this.wechatAlbumPrompts || {}), [contact.id]: [item, ...list].slice(0, 30) };
      this.wechatAlbumPromptSelectedId = item.id;
      this.wechatAlbumPromptEditText = item.prompt;
      this.wechatAlbumPromptEditNegative = item.negativePrompt;
      this.wechatAlbumPromptStep = 'prompt-list';
      await this.save?.();
    } catch (err) {
      console.error('[微信相册] 绘图提示词生成失败:', err.code, err.message, err.stack);
      this.wechatAlbumPromptError = err?.message || '绘图提示词生成失败，请稍后重试。';
      this.wechatError = this.wechatAlbumPromptError;
    } finally {
      if (reqId === this.wechatAlbumRequestId) this.wechatAlbumGenerating = false;
    }
  },

  openWechatAlbumPromptList() { this.wechatAlbumPromptStep = 'prompt-list'; },

  addWechatAlbumPrompt() {
    this.wechatAlbumPromptSelectedId = '';
    this.wechatAlbumPromptEditText = '';
    this.wechatAlbumPromptEditNegative = 'bad anatomy, extra fingers, extra arms, missing fingers, low quality, blurry, worst quality, watermark, text, logo, bad hands';
    this.wechatAlbumPromptStep = 'prompt-detail';
  },

  selectWechatAlbumPrompt(id) {
    this.wechatAlbumPromptSelectedId = id;
    const item = this.wechatAlbumSelectedPrompt();
    this.wechatAlbumPromptEditText = this.normalizeWechatAlbumPromptFixedTags?.(
      item?.prompt || '',
      item?.kind || this.wechatAlbumPromptDraft?.kind || 'natural',
      this.wechatProfileContact(),
    ) || item?.prompt || '';
    this.wechatAlbumPromptEditNegative = item?.negativePrompt || '';
    this.wechatAlbumPromptStep = 'prompt-detail';
  },

  async saveWechatAlbumManualPrompt() {
    const prompt = String(this.wechatAlbumPromptEditText || '').trim();
    if (!prompt) {
      this.wechatError = '请先填写正向提示词';
      return;
    }
    const contact = this.wechatProfileContact();
    const kind = this.wechatAlbumPromptDraft?.kind || 'custom';
    const normalizedPrompt = this.normalizeWechatAlbumPromptFixedTags?.(prompt, kind, contact) || prompt;
    const negativePrompt = String(this.wechatAlbumPromptEditNegative || '').trim();
    const item = { id: `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, prompt: normalizedPrompt, negativePrompt, raw: '', manual: true, createdAt: new Date().toISOString() };
    const list = this.wechatAlbumPromptList(contact);
    this.wechatAlbumPrompts = { ...(this.wechatAlbumPrompts || {}), [contact.id]: [item, ...list].slice(0, 30) };
    this.wechatAlbumPromptSelectedId = item.id;
    this.wechatAlbumPromptStep = 'prompt-list';
    await this.save?.();
  },
};
