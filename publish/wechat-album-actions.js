window.GameModules = window.GameModules || {};
window.GameModules.wechatAlbumActions = {
  openWechatContactProfile(id = '') {
    this.wechatSelectedContact = id || this.wechatSelectedContact || 'player-self';
    if (this.wechatSelected?.()?.group) return;
    this.wechatView = 'profile';
    this.wechatAlbumMode = 'profile';
    const contact = this.wechatSelected?.();
    if (!contact || contact.group) return;
    this.reuseWechatCharacterProfile?.(contact)
      .then((state) => {
        if (state) return this.save?.();
        this.wechatError = this.wechatMissingRoleCardMessage?.(contact);
      })
      .catch((err) => console.warn('[微信] 联系人资料读取失败:', err.code, err.message, err.stack));
  },

  backWechatContactProfile() {
    if (this.wechatAlbumMode === 'album') { this.wechatAlbumMode = 'profile'; return; }
    this.wechatView = 'home';
    this.wechatAlbumMode = 'profile';
  },

  openWechatAlbum() { this.wechatAlbumMode = 'album'; },
  wechatContactFromState(id = '') {
    const key = String(id || 'player-self').trim() || 'player-self';
    const state = this.rpgStates?.[key] || window.GameModules.sqliteSave?.getCharacterState?.(key) || (key === 'player-self' ? this.playerIdentityState?.() : null) || {};
    const profile = state.profile || {};
    const name = profile.name || state.name || (key === 'player-self' ? (this.playerName || this.playerProfile?.name || '玩家') : key);
    return { id: key, name, mark: String(name || key).slice(0, 1), relation: profile.role || state.role || '形象图目标', subtitle: profile.work || state.worldTag || '' };
  },
  wechatProfileContact() { return this.wechatSelected?.() || this.wechatContactFromState(this.wechatSelectedContact || 'player-self') || { id: 'player-self', name: '联系人', mark: '联' }; },
  wechatAlbumContact(targetId = '') {
    const key = String(targetId || this.wechatAlbumBodyFigureContext?.characterId || '').trim();
    if (!key) return this.wechatProfileContact();
    const stateContact = this.wechatContactFromState(key);
    const explicit = (this.wechatContacts?.() || []).find((item) => item?.id === key && !item?.group);
    if (!explicit) return stateContact;
    return {
      ...explicit,
      ...stateContact,
      id: key,
      mark: stateContact.mark || explicit.mark || String(stateContact.name || explicit.name || key).slice(0, 1),
      name: stateContact.name || explicit.name || key,
      relation: stateContact.relation || explicit.relation || explicit.subtitle || '',
      subtitle: stateContact.subtitle || explicit.subtitle || '',
    };
  },
  wechatAlbumPhotoListForContact(contact = this.wechatProfileContact()) {
    const raw = this.wechatAlbumPhotos?.[contact?.id || 'player-self'];
    if (Array.isArray(raw)) return raw.filter((item) => item?.url);
    return raw?.url ? [raw] : [];
  },
  wechatAlbumPhotoList() { return this.wechatAlbumPhotoListForContact(this.wechatProfileContact()); },
  wechatAlbumPhoto() { return this.wechatAlbumPhotoList()[0] || null; },
  refreshWechatAlbum() {
    const contact = this.wechatProfileContact();
    if (!contact?.id) return;
    const list = this.wechatAlbumPhotoList();
    this.wechatAlbumPhotos = { ...(this.wechatAlbumPhotos || {}), [contact.id]: [...list] };
  },

  openWechatAlbumDeleteConfirm(index = 0) {
    const list = this.wechatAlbumPhotoList();
    if (!list[index]) return;
    this.wechatAlbumDeleteConfirm = { open: true, index: Number(index) || 0 };
  },

  closeWechatAlbumDeleteConfirm() {
    this.wechatAlbumDeleteConfirm = { open: false, index: -1 };
  },

  async confirmDeleteWechatAlbumPhoto() {
    const contact = this.wechatProfileContact();
    const index = Number(this.wechatAlbumDeleteConfirm?.index);
    const list = this.wechatAlbumPhotoList();
    if (!contact?.id || !Number.isInteger(index) || index < 0 || !list[index]) {
      this.closeWechatAlbumDeleteConfirm();
      return;
    }
    this.wechatAlbumPhotos = {
      ...(this.wechatAlbumPhotos || {}),
      [contact.id]: list.filter((_, i) => i !== index),
    };
    this.closeWechatAlbumDeleteConfirm();
    await this.save?.();
  },

  wechatAlbumChoiceOpen() {
    this.wechatAlbumPromptStep = 'choice';
    this.wechatAlbumPromptDraft = { kind: 'natural', identityKeys: [], bodyKeys: [], customText: '', extraText: '' };
    this.wechatAlbumBodyFigureContext = null;
    this.wechatAlbumPromptOpen = true;
  },
  wechatAlbumChoiceClose() { if (!this.wechatAlbumGenerating) this.wechatAlbumPromptOpen = false; },

  bodyProfileImageKind(section = {}) {
    return String(section?.title || '').trim() === '盛装' ? 'dressed' : 'natural';
  },

  bodyProfileTargetState(section = {}) {
    const field = section?.fields?.[0] || null;
    return (field ? this.activeDetailState?.(field) : null)
      || this.identityTargetState?.()
      || this.playerIdentityState?.()
      || this.currentRpgState
      || null;
  },

  bodyFigureDefaultPartLayout(index = 0) {
    const points = [
      { x: 49, y: 9, side: 'left' },
      { x: 49, y: 19, side: 'left' },
      { x: 58, y: 16, side: 'right' },
      { x: 52, y: 24, side: 'right' },
      { x: 48, y: 32, side: 'left' },
      { x: 72, y: 36, side: 'right' },
      { x: 50, y: 44, side: 'left' },
      { x: 58, y: 53, side: 'right' },
      { x: 50, y: 58, side: 'right' },
      { x: 49, y: 68, side: 'left' },
      { x: 48, y: 84, side: 'left' },
    ];
    const item = points[index] || { x: 50, y: Math.min(88, 8 + (index * 8)), side: index % 2 ? 'right' : 'left' };
    return {
      anchor: { x: item.x, y: item.y },
      label: { x: item.side === 'right' ? 90 : 10, y: Math.min(88, Math.max(7, item.y)), side: item.side },
    };
  },

  bodyFigureNormalizedParts(list = []) {
    const cfg = window.GameModules.appearanceProfileTags;
    const names = cfg?.bodyParts?.() || [];
    const source = Array.isArray(list) ? list : [];
    const byName = new Map(source.map((item) => [String(item?.part || item?.name || '').trim(), item]));
    const ordered = names.length ? names.map((name, index) => byName.get(name) || { index: index + 1, part: name, tags: [], description: '' }) : source;
    return ordered.map((item, index) => {
      const normalized = cfg?.normalizePartItem?.(item, index + 1, item?.part || item?.name || '') || item || {};
      const layout = this.bodyFigureDefaultPartLayout(index);
      return {
        index: Number(normalized.index) || index + 1,
        part: String(normalized.part || item?.part || item?.name || `部位${index + 1}`).trim(),
        tags: Array.isArray(normalized.tags) ? normalized.tags : [],
        description: String(normalized.description || item?.description || item?.detail || '').trim(),
        anchor: layout.anchor,
        label: layout.label,
      };
    });
  },

  buildGeneratedBodyFigureMeta(kind = 'natural', contact = this.wechatAlbumContact(), drawResult = {}, drawOptions = {}) {
    const { state, profile } = this.wechatAlbumStateData(contact);
    const cfg = window.GameModules.appearanceProfileTags;
    const source = this.profileAppearanceSource?.(state || {}) || profile || {};
    const ownerId = String(contact?.id || state?.id || this.identityTargetId || 'player-self').trim() || 'player-self';
    const naturalMeta = cfg?.normalizeNaturalMeta?.(source.bodyProfileMeta || profile.bodyProfileMeta || {}, profile) || (source.bodyProfileMeta || {});
    const dressedMeta = cfg?.normalizeDressedMeta?.(source.dressedProfileMeta || profile.dressedProfileMeta || {}, profile) || (source.dressedProfileMeta || {});
    const partsSource = kind === 'dressed'
      ? (source.dressedProfile || profile.dressedProfile || [])
      : (source.bodyProfile || profile.bodyProfile || []);
    const parts = this.bodyFigureNormalizedParts(partsSource);
    const stateLabel = this.wechatAlbumKindLabel(kind);
    return {
      characterId: ownerId,
      ownerId,
      personId: ownerId,
      stateKind: kind === 'dressed' ? 'dressed' : 'natural',
      stateLabel,
      label: `${profile.name || contact?.name || ownerId} - ${stateLabel}生成形象图`,
      generated: true,
      real: true,
      source: 'body-profile-generator',
      prompt: drawOptions.prompt || '',
      negativePrompt: drawOptions.negativePrompt || '',
      taskId: drawResult.taskId || '',
      provider: drawResult.provider || this.selectedDrawProviderId?.() || '',
      overall: naturalMeta.overall || [],
      figure: naturalMeta.figure || [],
      height: naturalMeta.height || '',
      weight: naturalMeta.weight || '',
      skinTone: naturalMeta.skinTone || [],
      aura: naturalMeta.aura || [],
      styleBase: dressedMeta.styleBase || [],
      makeupBase: dressedMeta.makeupBase || [],
      colorScheme: dressedMeta.colorScheme || [],
      hosiery: dressedMeta.hosiery || [],
      hairstyle: dressedMeta.hairstyle || [],
      accessoryDensity: dressedMeta.accessoryDensity || [],
      tags: [
        ownerId,
        kind === 'dressed' ? 'dressed' : 'natural',
        ...(naturalMeta.overall || []),
        ...(naturalMeta.figure || []),
        ...(naturalMeta.skinTone || []),
        ...(naturalMeta.aura || []),
        ...(dressedMeta.styleBase || []),
        ...(dressedMeta.makeupBase || []),
      ].filter(Boolean),
      parts,
    };
  },

  async saveGeneratedBodyFigureAsset(imageUrl = '', kind = 'natural', contact = this.wechatAlbumContact(), drawResult = {}, drawOptions = {}) {
    const meta = this.buildGeneratedBodyFigureMeta(kind, contact, drawResult, drawOptions);
    const timestamp = Date.now();
    try {
      const res = await fetch('/__dev/body-figure-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, ownerId: meta.ownerId, kind, timestamp, meta }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      window.GameModules.bodyFigure?.registerEntry?.(data.entry, data.meta || { ...meta, id: data.path, image: String(data.imagePath || '').split('/').pop() || 'figure.png' });
      const bound = await window.GameModules.bodyFigure?.bindCurrentFigure?.(data.path, meta.ownerId, contact?.name || meta.ownerName || '', { stateKind: meta.stateKind, force: true });
      if (bound && !bound.ok) throw new Error(bound.error || '绑定当前形象图失败');
      return data;
    } catch (err) {
      console.warn('[body-figure] 生成形象图本地保存失败:', err?.message || err);
      this.wechatError = `图片已生成，但保存到 body-figures 失败：${err?.message || err}`;
      return null;
    }
  },

  async openBodyProfileImageGenerator(section = {}) {
    const kind = this.bodyProfileImageKind(section);
    const state = this.bodyProfileTargetState?.(section) || null;
    const contact = this.wechatContactFromState(state?.id || this.identityTargetId || 'player-self');
    this.wechatSelectedContact = contact.id;
    this.wechatAlbumBodyFigureContext = { characterId: contact.id, kind, sectionTitle: String(section?.title || ''), startedAt: Date.now() };
    this.wechatAlbumPromptOpen = true;
    this.wechatAlbumPromptError = '';
    await this.openWechatAlbumPromptEditor(kind);
  },

  async openWechatAlbumPromptEditor(kind = 'natural') {
    const contact = this.wechatAlbumContact();
    if (contact?.id === 'player-self') await this.ensurePlayerRpgState?.();
    else await this.ensureWechatUserProfile?.(contact);
    const options = this.wechatAlbumPromptOptions(kind);
    this.wechatAlbumPromptDraft = {
      kind,
      identityKeys: options.identity.map((item) => item.key),
      bodyKeys: options.body.map((item) => item.key),
      customText: '',
      extraText: '',
      bodyFigureContext: this.wechatAlbumBodyFigureContext?.kind === kind ? { ...this.wechatAlbumBodyFigureContext } : null,
    };
    this.wechatAlbumPromptStep = 'edit';
  },

  wechatAlbumStateData(contact = this.wechatAlbumContact()) {
    const key = String(contact?.id || 'player-self').trim() || 'player-self';
    let state = this.rpgStates?.[key] || window.GameModules.sqliteSave?.getCharacterState?.(key) || {};
    if (key === 'player-self') {
      const fallbackProfile = this.playerDisplayCharacter?.() || this.playerCharacterBase?.() || {};
      const savedProfile = state.profile || {};
      const profile = { ...fallbackProfile, ...savedProfile, id: 'player-self', isPlayer: true };
      ['name', 'gender', 'age', 'birthday', 'role', 'job', 'appearance', 'detail', 'description', 'personality'].forEach((field) => {
        if (!String(profile[field] || '').trim() && fallbackProfile[field]) profile[field] = fallbackProfile[field];
      });
      state = { ...state, id: 'player-self', name: profile.name || state.name || this.playerName || '', profile };
    }
    return { state, profile: state.profile || {} };
  },
  wechatAlbumIdentityItems(contact = this.wechatAlbumContact(), state = {}, profile = {}) {
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
    const contact = this.wechatAlbumContact();
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
  wechatAlbumPromptPreview() { return this.wechatAlbumPhotoPrompt(this.wechatAlbumContact(), this.wechatAlbumPromptDraft?.kind || 'natural', this.wechatAlbumPromptDraft); },
  wechatAlbumSelectedCharCount() {
    const selected = this.wechatAlbumSelectedText?.();
    const text = selected ? [selected.identityInfo, selected.bodyText, selected.extraText].filter(Boolean).join('\n') : this.wechatAlbumPromptPreview();
    return String(text || '').trim().length;
  },
  wechatAlbumIdentityInfo(contact, state = {}, profile = {}) { return this.wechatAlbumIdentityItems(contact, state, profile).map((item) => item.text).join('\n'); },
  wechatAlbumBodyText(body) { return this.wechatAlbumBodyItems(body).map((item) => item.text).join('\n'); },

  wechatAlbumPhotoPrompt(contact, kind = 'natural', draft = null) {
    const ctx = this.wechatAlbumTagContext(contact, kind, draft);
    const template = this.wechatAlbumDrawTagTemplate?.() || window.GameModules.pictureGeneratePrompts?.drawTagPrompt || '';
    return this.renderWechatAlbumPrompt(template, ctx).slice(0, 2000);
  },

  async generateWechatAlbumSelectedPhoto() { await this.generateWechatAlbumPhotoFromSelectedPrompt(); },
  async generateWechatAlbumPhotoFromSelectedPrompt() {
    const selectedPrompt = this.wechatAlbumSelectedPrompt?.();
    const kind = selectedPrompt?.kind || this.wechatAlbumPromptDraft?.kind || 'natural';
    const contact = this.wechatAlbumContact();
    const prompt = this.normalizeWechatAlbumPromptFixedTags?.(
      this.wechatAlbumPromptEditText || selectedPrompt?.prompt || '',
      kind,
      contact,
    ) || this.wechatAlbumPromptEditText || selectedPrompt?.prompt || '';
    const negativePrompt = this.wechatAlbumPromptEditNegative || selectedPrompt?.negativePrompt || '';
    if (selectedPrompt) {
      const list = this.wechatAlbumPromptList(contact).map((item) => item.id === selectedPrompt.id ? { ...item, prompt, negativePrompt } : item);
      this.wechatAlbumPrompts = { ...(this.wechatAlbumPrompts || {}), [contact.id]: list };
      await this.save?.();
    }
    await this.generateWechatAlbumPhoto(kind, { prompt, negativePrompt });
  },
  async generateWechatAlbumPhoto(kind = 'natural', promptData = null) {
    if (this.wechatAlbumGenerating) return;
    const contact = this.wechatAlbumContact();
    if (!contact || contact.group) return;
    const bodyFigureContext = this.wechatAlbumBodyFigureContext?.characterId === contact.id
      ? { ...this.wechatAlbumBodyFigureContext }
      : null;
    const reqId = (this.wechatAlbumRequestId || 0) + 1;
    this.wechatAlbumRequestId = reqId;
    this.wechatAlbumGenerating = true;
    this.wechatAlbumPromptOpen = false;
    try {
      if (contact?.id === 'player-self') await this.ensurePlayerRpgState?.();
      else await this.ensureWechatUserProfile?.(contact);
      const prompt = String(promptData?.prompt || '').trim();
      if (!prompt) throw new Error('请先选择或生成绘图提示词');
      const negativePrompt = String(promptData?.negativePrompt || '').trim() || 'bad anatomy, extra fingers, extra arms, missing fingers, low quality, blurry, worst quality, watermark, text, logo, bad hands';
      const promptWithFixedTags = this.appendWechatAlbumFixedTags?.(prompt, kind, contact) || prompt;
      const safePrompt = this.pictureGenerateSafeReplacements?.(promptWithFixedTags) || promptWithFixedTags;
      const safeNegativePrompt = this.pictureGenerateSafeReplacements?.(negativePrompt) || negativePrompt;
      const drawOptions = { prompt: safePrompt.slice(0, 2000), dimension: '2:3', model: this.selectedDrawModelId?.() || 'anime', negativePrompt: safeNegativePrompt.slice(0, 2000) };
      const titleState = this.wechatAlbumKindLabel(kind);
      const drawProvider = this.selectedDrawProviderId?.() || 'pixai';
      const tokenRecordId = window.GameModules.tokenStats?.record?.(`draw-wechat-album-${kind}`, drawOptions.prompt, { model: `${drawProvider}:${drawOptions.model}`, title: `微信相册图片生成｜${contact.name || '联系人'}｜${titleState}`, category: '图片生成', summary: '微信联系人相册全身正面照绘图请求。', kind: 'draw' });
      const result = await this.wechatDrawWithRetry(() => window.GameModules.drawProvider.generate(drawOptions));
      window.GameModules.tokenStats?.recordResponse?.(tokenRecordId, JSON.stringify(result || {}, null, 2), result?.images || []);
      if (reqId !== this.wechatAlbumRequestId) return;
      const url = result?.images?.[0] || '';
      if (!url) throw new Error('图片生成完成但没有返回图片');
      const savedFigure = bodyFigureContext
        ? await this.saveGeneratedBodyFigureAsset(url, kind, contact, result, drawOptions)
        : null;
      const list = this.wechatAlbumPhotoListForContact(contact);
      const photo = {
        url: savedFigure?.imageSrc || url,
        originalUrl: savedFigure?.imageSrc ? url : '',
        kind,
        taskId: result.taskId || '',
        real: Boolean(bodyFigureContext),
        createdAt: new Date().toISOString(),
        characterId: contact.id,
        bodyFigurePath: savedFigure?.path || '',
        bodyFigureMetaPath: savedFigure?.metaPath || '',
        bodyFigureImagePath: savedFigure?.imagePath || '',
      };
      this.wechatAlbumPhotos = { ...(this.wechatAlbumPhotos || {}), [contact.id]: [photo, ...list] };
      if (bodyFigureContext) {
        await this.autoCaptureWechatAvatar?.(0, contact);
        this.wechatAlbumBodyFigureContext = null;
      }
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
        const retryable = (window.dzmm?.errors?.isDzmmError?.(err) && err.retryable) || err?.retryable === true;
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
