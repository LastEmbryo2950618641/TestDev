window.GameModules = window.GameModules || {};
window.GameModules.wechatAlbumActions = {
  openWechatContactProfile(id = '') {
    this.wechatSelectedContact = id || this.wechatSelectedContact || 'player-self';
    if (this.wechatSelected?.()?.group) return;
    this.wechatView = 'profile';
    this.wechatAlbumMode = 'profile';
    const contact = this.wechatSelected?.();
    if (contact && !contact.group) this.ensureWechatUserProfile?.(contact).then(() => this.save?.()).catch((err) => console.warn('[微信] 联系人资料补全失败:', err.code, err.message, err.stack));
  },

  backWechatContactProfile() {
    if (this.wechatAlbumMode === 'album') {
      this.wechatAlbumMode = 'profile';
      return;
    }
    this.wechatView = 'home';
    this.wechatAlbumMode = 'profile';
  },

  openWechatAlbum() {
    this.wechatAlbumMode = 'album';
  },

  wechatProfileContact() {
    return this.wechatSelected?.() || { id: 'player-self', name: '联系人', mark: '联' };
  },

  wechatAlbumPhoto() {
    const id = this.wechatProfileContact()?.id || 'player-self';
    return this.wechatAlbumPhotos?.[id] || null;
  },

  wechatAlbumChoiceOpen() {
    this.wechatAlbumPromptOpen = true;
  },

  wechatAlbumChoiceClose() {
    if (!this.wechatAlbumGenerating) this.wechatAlbumPromptOpen = false;
  },

  async generateWechatAlbumPhoto(kind = 'natural') {
    if (this.wechatAlbumGenerating) return;
    const contact = this.wechatProfileContact();
    if (!contact || contact.group) return;
    const reqId = (this.wechatAlbumRequestId || 0) + 1;
    this.wechatAlbumRequestId = reqId;
    this.wechatAlbumGenerating = true;
    this.wechatAlbumPromptOpen = false;
    try {
      await this.ensureWechatUserProfile?.(contact);
      const prompt = this.wechatAlbumPhotoPrompt(contact, kind);
      const drawOptions = {
        prompt,
        dimension: '2:3',
        model: 'anime',
        negativePrompt: 'lowres, bad anatomy, bad hands, text, error, missing fingers, worst quality, low quality, jpeg artifacts, watermark, blurry',
      };
      const tokenRecordId = window.GameModules.tokenStats?.record?.(`draw-wechat-album-${kind}`, prompt, {
        model: drawOptions.model,
        title: `微信相册图片生成｜${contact.name || '联系人'}｜${kind === 'dressed' ? '盛装状态' : '自然状态'}`,
        category: '图片生成',
        summary: '微信联系人相册全身正面照绘图请求。',
        kind: 'draw',
      });
      const result = await this.wechatDrawWithRetry(() => window.dzmm.draw.generate(drawOptions));
      window.GameModules.tokenStats?.recordResponse?.(tokenRecordId, JSON.stringify(result || {}, null, 2), result?.images || []);
      if (reqId !== this.wechatAlbumRequestId) return;
      const url = result?.images?.[0] || '';
      if (!url) throw new Error('图片生成完成但没有返回图片');
      this.wechatAlbumPhotos = { ...(this.wechatAlbumPhotos || {}), [contact.id]: { url, kind, taskId: result.taskId || '', real: false, createdAt: new Date().toISOString() } };
      await this.save?.();
    } catch (err) {
      if (reqId !== this.wechatAlbumRequestId) return;
      console.error('[微信相册] 图片生成失败:', err.code, err.message, err.stack);
      this.wechatError = err?.message || '照片生成失败，请稍后重试。';
    } finally {
      if (reqId === this.wechatAlbumRequestId) this.wechatAlbumGenerating = false;
    }
  },

  async wechatDrawWithRetry(fn, max = 3) {
    for (let i = 0; i < max; i += 1) {
      try { return await fn(); }
      catch (err) {
        const retryable = window.dzmm?.errors?.isDzmmError?.(err) && err.retryable;
        if (!retryable || i === max - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (2 ** i)));
      }
    }
    return null;
  },

  markWechatAlbumPhotoReal() {
    const contact = this.wechatProfileContact();
    const photo = this.wechatAlbumPhoto();
    if (!contact || !photo) return;
    this.wechatAlbumPhotos = { ...(this.wechatAlbumPhotos || {}), [contact.id]: { ...photo, real: true } };
    this.save?.();
  },

  wechatAlbumIdentityInfo(contact, state = {}, profile = {}) {
    return [
      `姓名：${profile.name || contact.name || '未记录'}`,
      `身份：${profile.role || contact.relation || '微信联系人'}`,
      `性别：${profile.gender || '未记录'}`,
      `年龄/生日：${profile.age || state.values?.age || '未记录'} / ${profile.birthday || '未记录'}`,
      `职业：${profile.job || '未记录'}`,
      `外貌：${profile.appearance || '未记录'}`,
      `性格：${profile.personality || '未记录'}`,
      `人物说明：${profile.detail || profile.description || '未记录'}`,
      `人际关系：${profile.relationships || contact.relation || '未记录'}`,
    ].join('\n');
  },

  wechatAlbumBodyText(body) {
    return Array.isArray(body) && body.length ? body.map((item) => `${item.part || item.name || '部位'}：${item.description || item.detail || '未记录'}`).join('\n') : '未记录';
  },

  renderWechatAlbumPrompt(template, vars) {
    return String(template || '').replace(/\{角色身份信息\}/g, vars.identityInfo)
      .replace(/\{自然状态部位描述\}/g, vars.naturalText)
      .replace(/\{盛装部位描述\}/g, vars.dressedText)
      .replace(/\{生成状态\}/g, vars.stateName)
      .replace(/\{状态部位描述\}/g, vars.bodyText);
  },

  wechatAlbumPhotoPrompt(contact, kind = 'natural') {
    const state = this.rpgStates?.[contact.id] || window.GameModules.sqliteSave?.getCharacterState?.(contact.id) || {};
    const profile = state.profile || {};
    const identityInfo = this.wechatAlbumIdentityInfo(contact, state, profile);
    const naturalText = this.wechatAlbumBodyText(profile.bodyProfile);
    const dressedText = this.wechatAlbumBodyText(profile.dressedProfile);
    const stateName = kind === 'dressed' ? '盛装状态' : '自然状态';
    const template = window.GameModules.pictureGeneratePrompts?.wechatAlbumPhoto || '请根据以下角色个人身份信息与{生成状态}部位描述生成一张全身正面照。\n\n{角色身份信息}\n\n{状态部位描述}';
    return this.renderWechatAlbumPrompt(template, { identityInfo, naturalText, dressedText, stateName, bodyText: kind === 'dressed' ? dressedText : naturalText }).slice(0, 2600);
  },
};
