window.GameModules = window.GameModules || {};
window.GameModules.wechatAlbumActions = {
  openWechatContactProfile(id = '') {
    this.wechatSelectedContact = id || this.wechatSelectedContact || 'player-self';
    if (this.wechatSelected?.()?.group) return;
    this.wechatView = 'profile';
    this.wechatAlbumMode = 'profile';
    const contact = this.wechatSelected?.();
    if (!contact || contact.group) return;
    const existing = this.findWechatCharacterState?.(contact);
    if (existing?.profile && window.GameModules.characterProfile.isRoleCard?.(existing.profile)) {
      this.bindWechatCharacterState?.(existing, contact);
      return;
    }
    this.ensureWechatUserProfile?.(contact).then(() => this.save?.()).catch((err) => console.warn('[微信] 联系人资料补全失败:', err.code, err.message, err.stack));
  },

  backWechatContactProfile() {
    if (this.wechatAlbumMode === 'album') { this.wechatAlbumMode = 'profile'; return; }
    this.wechatView = 'home';
    this.wechatAlbumMode = 'profile';
  },

  openWechatAlbum() { this.wechatAlbumMode = 'album'; },
  wechatProfileContact() { return this.wechatSelected?.() || { id: 'player-self', name: '联系人', mark: '联' }; },
  wechatAlbumPhotoList() {
    const raw = this.wechatAlbumPhotos?.[this.wechatProfileContact()?.id || 'player-self'];
    if (Array.isArray(raw)) return raw.filter((item) => item?.url);
    return raw?.url ? [raw] : [];
  },
  wechatAlbumPhoto() { return this.wechatAlbumPhotoList()[0] || null; },
  refreshWechatAlbum() {
    const contact = this.wechatProfileContact();
    if (!contact?.id) return;
    const list = this.wechatAlbumPhotoList();
    this.wechatAlbumPhotos = { ...(this.wechatAlbumPhotos || {}), [contact.id]: [...list] };
  },

  wechatAlbumChoiceOpen() {
    this.wechatAlbumPromptStep = 'choice';
    this.wechatAlbumPromptDraft = { kind: 'natural', identityKeys: [], bodyKeys: [], customText: '', extraText: '' };
    this.wechatAlbumPromptOpen = true;
  },
  wechatAlbumChoiceClose() { if (!this.wechatAlbumGenerating) this.wechatAlbumPromptOpen = false; },

  async openWechatAlbumPromptEditor(kind = 'natural') {
    const contact = this.wechatProfileContact();
    await this.ensureWechatUserProfile?.(contact);
    const options = this.wechatAlbumPromptOptions(kind);
    this.wechatAlbumPromptDraft = {
      kind,
      identityKeys: options.identity.map((item) => item.key),
      bodyKeys: options.body.map((item) => item.key),
      customText: '',
      extraText: '',
    };
    this.wechatAlbumPromptStep = 'edit';
  },

  wechatAlbumStateData(contact = this.wechatProfileContact()) {
    const state = this.rpgStates?.[contact.id] || window.GameModules.sqliteSave?.getCharacterState?.(contact.id) || {};
    return { state, profile: state.profile || {} };
  },
  wechatAlbumIdentityItems(contact = this.wechatProfileContact(), state = {}, profile = {}) {
    return [
      ['name', '姓名', profile.name || contact.name || '未记录'], ['role', '身份', profile.role || contact.relation || '微信联系人'],
      ['gender', '性别', profile.gender || '未记录'], ['age', '年龄/生日', `${profile.age || state.values?.age || '未记录'} / ${profile.birthday || '未记录'}`],
      ['job', '职业', profile.job || '未记录'], ['appearance', '外貌', profile.appearance || '未记录'],
      ['personality', '性格', profile.personality || '未记录'], ['detail', '人物说明', profile.detail || profile.description || '未记录'],
      ['relationships', '人际关系', profile.relationships || contact.relation || '未记录'],
    ].map(([key, label, value]) => ({ key, label, value, text: `${label}：${value}` }));
  },
  wechatAlbumBodyItems(body = [], profile = {}, kind = 'natural') {
    const cfg = window.GameModules.appearanceProfileTags;
    const items = [];
    const metaText = kind === 'dressed'
      ? cfg?.formatDressedMeta?.(profile.dressedProfileMeta || {})
      : cfg?.formatNaturalMeta?.(profile.bodyProfileMeta || {});
    if (metaText) items.push({ key: 'body-meta', label: '全局', value: metaText, text: `全局：${metaText}` });
    if (Array.isArray(body) && body.length) {
      body.forEach((item, index) => {
        const label = item.part || item.name || `部位${index + 1}`;
        const tags = cfg?.formatPartTags?.(item) || '';
        const value = item.description || item.detail || '未记录';
        items.push({
          key: `body-${index}`,
          label,
          value,
          text: tags ? `${label}[${tags}]：${value}` : `${label}：${value}`,
        });
      });
    }
    return items.length ? items : [{ key: 'body-empty', label: '部位描述', value: '未记录', text: '未记录' }];
  },
  wechatAlbumPromptOptions(kind = this.wechatAlbumPromptDraft?.kind || 'natural') {
    const contact = this.wechatProfileContact();
    const { state, profile } = this.wechatAlbumStateData(contact);
    return {
      identity: this.wechatAlbumIdentityItems(contact, state, profile),
      body: kind === 'custom' ? [] : this.wechatAlbumBodyItems(kind === 'dressed' ? profile.dressedProfile : profile.bodyProfile, profile, kind),
    };
  },
  wechatAlbumKindLabel(kind = this.wechatAlbumPromptDraft?.kind || 'natural') {
    return kind === 'custom' ? '自定义状态' : (kind === 'dressed' ? '盛装状态' : '自然状态');
  },
  wechatAlbumSelectedText() {
    const draft = this.wechatAlbumPromptDraft || { kind: 'natural', identityKeys: [], bodyKeys: [], customText: '', extraText: '' };
    const options = this.wechatAlbumPromptOptions(draft.kind);
    const identityItems = options.identity.filter((item) => draft.identityKeys.includes(item.key));
    const bodyItems = draft.kind === 'custom' ? [] : options.body.filter((item) => draft.bodyKeys.includes(item.key));
    const identityInfo = identityItems.map((item) => item.text).join('\n') || '未记录';
    const bodyText = draft.kind === 'custom' ? String(draft.customText || '').trim() : bodyItems.map((item) => item.text).join('\n');
    return { identityInfo, bodyText: bodyText || '未记录', extraText: String(draft.extraText || '').trim(), stateName: this.wechatAlbumKindLabel(draft.kind), kind: draft.kind, identityItems, bodyItems };
  },
  wechatAlbumPromptPreview() { return this.wechatAlbumPhotoPrompt(this.wechatProfileContact(), this.wechatAlbumPromptDraft?.kind || 'natural', this.wechatAlbumPromptDraft); },
  wechatAlbumSelectedCharCount() { return this.wechatAlbumPromptPreview().length; },
  wechatAlbumIdentityInfo(contact, state = {}, profile = {}) { return this.wechatAlbumIdentityItems(contact, state, profile).map((item) => item.text).join('\n'); },
  wechatAlbumBodyText(body) { return this.wechatAlbumBodyItems(body).map((item) => item.text).join('\n'); },

  wechatAlbumPhotoPrompt(contact, kind = 'natural', draft = null) {
    const ctx = this.wechatAlbumTagContext(contact, kind, draft);
    const template = window.GameModules.pictureGeneratePrompts?.drawTagPrompt || '';
    return this.renderWechatAlbumPrompt(template, ctx).slice(0, 2000);
  },

  async generateWechatAlbumSelectedPhoto() { await this.generateWechatAlbumPhotoFromSelectedPrompt(); },
  async generateWechatAlbumPhotoFromSelectedPrompt() {
    const selectedPrompt = this.wechatAlbumSelectedPrompt?.();
    const kind = selectedPrompt?.kind || this.wechatAlbumPromptDraft?.kind || 'natural';
    const prompt = this.wechatAlbumPromptEditText || selectedPrompt?.prompt || '';
    const negativePrompt = this.wechatAlbumPromptEditNegative || selectedPrompt?.negativePrompt || '';
    if (selectedPrompt) {
      const contact = this.wechatProfileContact();
      const list = this.wechatAlbumPromptList(contact).map((item) => item.id === selectedPrompt.id ? { ...item, prompt, negativePrompt } : item);
      this.wechatAlbumPrompts = { ...(this.wechatAlbumPrompts || {}), [contact.id]: list };
      await this.save?.();
    }
    await this.generateWechatAlbumPhoto(kind, { prompt, negativePrompt });
  },
  async generateWechatAlbumPhoto(kind = 'natural', promptData = null) {
    if (this.wechatAlbumGenerating) return;
    const contact = this.wechatProfileContact();
    if (!contact || contact.group) return;
    const reqId = (this.wechatAlbumRequestId || 0) + 1;
    this.wechatAlbumRequestId = reqId;
    this.wechatAlbumGenerating = true;
    this.wechatAlbumPromptOpen = false;
    try {
      await this.ensureWechatUserProfile?.(contact);
      const prompt = String(promptData?.prompt || '').trim();
      if (!prompt) throw new Error('请先选择或生成绘图提示词');
      const negativePrompt = String(promptData?.negativePrompt || '').trim() || 'bad anatomy, extra fingers, extra arms, missing fingers, low quality, blurry, worst quality, watermark, text, logo, bad hands';
      const safePrompt = window.GameModules.applyPictureGenerateSensitiveReplacements?.(prompt) || prompt;
      const safeNegativePrompt = window.GameModules.applyPictureGenerateSensitiveReplacements?.(negativePrompt) || negativePrompt;
      const drawOptions = { prompt: safePrompt.slice(0, 2000), dimension: '2:3', model: this.selectedDrawModelId?.() || 'anime', negativePrompt: safeNegativePrompt.slice(0, 2000) };
      const titleState = this.wechatAlbumKindLabel(kind);
      const tokenRecordId = window.GameModules.tokenStats?.record?.(`draw-wechat-album-${kind}`, drawOptions.prompt, { model: drawOptions.model, title: `微信相册图片生成｜${contact.name || '联系人'}｜${titleState}`, category: '图片生成', summary: '微信联系人相册全身正面照绘图请求。', kind: 'draw' });
      const result = await this.wechatDrawWithRetry(() => window.dzmm.draw.generate(drawOptions));
      window.GameModules.tokenStats?.recordResponse?.(tokenRecordId, JSON.stringify(result || {}, null, 2), result?.images || []);
      if (reqId !== this.wechatAlbumRequestId) return;
      const url = result?.images?.[0] || '';
      if (!url) throw new Error('图片生成完成但没有返回图片');
      const list = this.wechatAlbumPhotoList();
      this.wechatAlbumPhotos = { ...(this.wechatAlbumPhotos || {}), [contact.id]: [{ url, kind, taskId: result.taskId || '', real: false, createdAt: new Date().toISOString() }, ...list] };
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
      try { return await fn(); } catch (err) {
        const retryable = window.dzmm?.errors?.isDzmmError?.(err) && err.retryable;
        if (!retryable || i === max - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (2 ** i)));
      }
    }
    return null;
  },

  async markWechatAlbumPhotoReal(index = 0) {
    const contact = this.wechatProfileContact();
    const list = this.wechatAlbumPhotoList();
    if (!contact || !list[index]) return;
    this.wechatAlbumPhotos = { ...(this.wechatAlbumPhotos || {}), [contact.id]: list.map((photo, i) => i === index ? { ...photo, real: true } : photo) };
    await this.save?.();
    await this.autoCaptureWechatAvatar?.(index);
  },
};
