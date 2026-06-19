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

  wechatAlbumChoiceOpen() {
    this.wechatAlbumPromptStep = 'choice';
    this.wechatAlbumPromptDraft = { kind: 'natural', identityKeys: [], bodyKeys: [], customText: '' };
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
    ].map(([key, label, value]) => ({ key, label, text: `${label}：${value}` }));
  },
  wechatAlbumBodyItems(body = []) {
    return Array.isArray(body) && body.length ? body.map((item, index) => {
      const label = item.part || item.name || `部位${index + 1}`;
      return { key: `body-${index}`, label, text: `${label}：${item.description || item.detail || '未记录'}` };
    }) : [{ key: 'body-empty', label: '部位描述', text: '未记录' }];
  },
  wechatAlbumPromptOptions(kind = this.wechatAlbumPromptDraft?.kind || 'natural') {
    const contact = this.wechatProfileContact();
    const { state, profile } = this.wechatAlbumStateData(contact);
    return {
      identity: this.wechatAlbumIdentityItems(contact, state, profile),
      body: kind === 'custom' ? [] : this.wechatAlbumBodyItems(kind === 'dressed' ? profile.dressedProfile : profile.bodyProfile),
    };
  },
  wechatAlbumKindLabel(kind = this.wechatAlbumPromptDraft?.kind || 'natural') {
    return kind === 'custom' ? '自定义状态' : (kind === 'dressed' ? '盛装状态' : '自然状态');
  },
  wechatAlbumSelectedText() {
    const draft = this.wechatAlbumPromptDraft || { kind: 'natural', identityKeys: [], bodyKeys: [], customText: '' };
    const options = this.wechatAlbumPromptOptions(draft.kind);
    const identityInfo = options.identity.filter((item) => draft.identityKeys.includes(item.key)).map((item) => item.text).join('\n') || '未记录';
    const bodyText = draft.kind === 'custom' ? String(draft.customText || '').trim() : options.body.filter((item) => draft.bodyKeys.includes(item.key)).map((item) => item.text).join('\n');
    return { identityInfo, bodyText: bodyText || '未记录', stateName: this.wechatAlbumKindLabel(draft.kind), kind: draft.kind };
  },
  wechatAlbumSelectedCharCount() { return this.wechatAlbumPhotoPrompt(this.wechatProfileContact(), this.wechatAlbumPromptDraft?.kind || 'natural', this.wechatAlbumPromptDraft).length; },
  wechatAlbumIdentityInfo(contact, state = {}, profile = {}) { return this.wechatAlbumIdentityItems(contact, state, profile).map((item) => item.text).join('\n'); },
  wechatAlbumBodyText(body) { return this.wechatAlbumBodyItems(body).map((item) => item.text).join('\n'); },

  renderWechatAlbumPrompt(template, vars) {
    return String(template || '').replace(/\{角色身份信息\}/g, vars.identityInfo)
      .replace(/\{自然状态部位描述\}/g, vars.naturalText).replace(/\{盛装部位描述\}/g, vars.dressedText)
      .replace(/\{生成状态\}/g, vars.stateName).replace(/\{状态部位描述\}/g, vars.bodyText);
  },
  wechatAlbumPhotoPrompt(contact, kind = 'natural', draft = null) {
    const { state, profile } = this.wechatAlbumStateData(contact);
    const selected = draft ? this.wechatAlbumSelectedText() : null;
    const identityInfo = selected?.identityInfo || this.wechatAlbumIdentityInfo(contact, state, profile);
    const naturalText = kind === 'natural' && selected ? selected.bodyText : this.wechatAlbumBodyText(profile.bodyProfile);
    const dressedText = kind === 'dressed' && selected ? selected.bodyText : this.wechatAlbumBodyText(profile.dressedProfile);
    const stateName = selected?.stateName || this.wechatAlbumKindLabel(kind);
    const bodyText = selected?.bodyText || (kind === 'dressed' ? dressedText : naturalText);
    const template = window.GameModules.pictureGeneratePrompts?.wechatAlbumPhoto || '请根据以下角色个人身份信息与{生成状态}部位描述生成一张全身正面照。\n\n{角色身份信息}\n\n{状态部位描述}';
    return this.renderWechatAlbumPrompt(template, { identityInfo, naturalText, dressedText, stateName, bodyText }).slice(0, 2600);
  },

  async generateWechatAlbumSelectedPhoto() { await this.generateWechatAlbumPhoto(this.wechatAlbumPromptDraft?.kind || 'natural', this.wechatAlbumPromptDraft); },
  async generateWechatAlbumPhoto(kind = 'natural', draft = null) {
    if (this.wechatAlbumGenerating) return;
    const contact = this.wechatProfileContact();
    if (!contact || contact.group) return;
    const reqId = (this.wechatAlbumRequestId || 0) + 1;
    this.wechatAlbumRequestId = reqId;
    this.wechatAlbumGenerating = true;
    this.wechatAlbumPromptOpen = false;
    try {
      await this.ensureWechatUserProfile?.(contact);
      const prompt = this.wechatAlbumPhotoPrompt(contact, kind, draft);
      const drawOptions = { prompt, dimension: '2:3', model: 'anime', negativePrompt: 'lowres, bad anatomy, bad hands, text, error, missing fingers, worst quality, low quality, jpeg artifacts, watermark, blurry' };
      const titleState = this.wechatAlbumKindLabel(kind);
      const tokenRecordId = window.GameModules.tokenStats?.record?.(`draw-wechat-album-${kind}`, prompt, { model: drawOptions.model, title: `微信相册图片生成｜${contact.name || '联系人'}｜${titleState}`, category: '图片生成', summary: '微信联系人相册全身正面照绘图请求。', kind: 'draw' });
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

  markWechatAlbumPhotoReal(index = 0) {
    const contact = this.wechatProfileContact();
    const list = this.wechatAlbumPhotoList();
    if (!contact || !list[index]) return;
    this.wechatAlbumPhotos = { ...(this.wechatAlbumPhotos || {}), [contact.id]: list.map((photo, i) => i === index ? { ...photo, real: true } : photo) };
    this.save?.();
  },
};
