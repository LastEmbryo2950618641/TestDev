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
  wechatContactFromState(...args) { return window.GameModules.app.wechat.albumOrchestration.wechatContactFromState.call(this, ...args); },
  wechatProfileContact(...args) { return window.GameModules.app.wechat.albumOrchestration.wechatProfileContact.call(this, ...args); },
  wechatAlbumContact(...args) { return window.GameModules.app.wechat.albumOrchestration.wechatAlbumContact.call(this, ...args); },
  wechatAlbumPhotoListForContact(...args) { return window.GameModules.app.wechat.albumOrchestration.wechatAlbumPhotoListForContact.call(this, ...args); },
  wechatAlbumPhotoList(...args) { return window.GameModules.app.wechat.albumOrchestration.wechatAlbumPhotoList.call(this, ...args); },
  wechatAlbumPhoto(...args) { return window.GameModules.app.wechat.albumOrchestration.wechatAlbumPhoto.call(this, ...args); },
  refreshWechatAlbum(...args) { return window.GameModules.app.wechat.albumOrchestration.refreshWechatAlbum.call(this, ...args); },

  openWechatAlbumDeleteConfirm(...args) { return window.GameModules.app.wechat.albumUiStateHelpers.openWechatAlbumDeleteConfirm.call(this, ...args); },

  closeWechatAlbumDeleteConfirm(...args) { return window.GameModules.app.wechat.albumUiStateHelpers.closeWechatAlbumDeleteConfirm.call(this, ...args); },

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

  wechatAlbumChoiceOpen(...args) { return window.GameModules.app.wechat.albumUiStateHelpers.wechatAlbumChoiceOpen.call(this, ...args); },
  wechatAlbumChoiceClose(...args) { return window.GameModules.app.wechat.albumUiStateHelpers.wechatAlbumChoiceClose.call(this, ...args); },

  bodyProfileImageKind(...args) { return window.GameModules.app.wechat.albumBodyFigureHelpers.bodyProfileImageKind.call(this, ...args); },
  bodyProfileTargetState(...args) { return window.GameModules.app.wechat.albumBodyFigureHelpers.bodyProfileTargetState.call(this, ...args); },
  bodyFigureDefaultPartLayout(...args) { return window.GameModules.app.wechat.albumBodyFigureHelpers.bodyFigureDefaultPartLayout.call(this, ...args); },
  bodyFigureNormalizedParts(...args) { return window.GameModules.app.wechat.albumBodyFigureHelpers.bodyFigureNormalizedParts.call(this, ...args); },
  buildGeneratedBodyFigureMeta(...args) { return window.GameModules.app.wechat.albumBodyFigureHelpers.buildGeneratedBodyFigureMeta.call(this, ...args); },

  async saveGeneratedBodyFigureAsset(imageUrl = '', kind = 'natural', contact = this.wechatAlbumContact(), drawResult = {}, drawOptions = {}) {
    const meta = this.buildGeneratedBodyFigureMeta(kind, contact, drawResult, drawOptions);
    const timestamp = Date.now();
    try {
      const res = await window.GameModules.platform.core.assets.bodyFigure.saveImage({ imageUrl, ownerId: meta.ownerId, kind, timestamp, meta });
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
    const draft = window.GameModules.app.wechat.albumPromptEditorHelpers.wechatAlbumPromptEditorDraft.call(this, kind, this.wechatAlbumBodyFigureContext);
    draft.identityKeys = options.identity.map((item) => item.key);
    draft.bodyKeys = options.body.map((item) => item.key);
    this.wechatAlbumPromptDraft = draft;
    this.wechatAlbumPromptStep = 'edit';
  },

  wechatAlbumStateData(...args) { return window.GameModules.app.wechat.albumPromptHelpers.wechatAlbumStateData.call(this, ...args); },
  wechatAlbumIdentityItems(...args) { return window.GameModules.app.wechat.albumPromptHelpers.wechatAlbumIdentityItems.call(this, ...args); },
  wechatAlbumBodyItems(...args) { return window.GameModules.app.wechat.albumPromptHelpers.wechatAlbumBodyItems.call(this, ...args); },
  wechatAlbumPromptOptions(...args) { return window.GameModules.app.wechat.albumPromptHelpers.wechatAlbumPromptOptions.call(this, ...args); },
  wechatAlbumKindLabel(...args) { return window.GameModules.app.wechat.albumPromptHelpers.wechatAlbumKindLabel.call(this, ...args); },
  wechatAlbumSelectedText(...args) { return window.GameModules.app.wechat.albumPromptHelpers.wechatAlbumSelectedText.call(this, ...args); },
  wechatAlbumPromptPreview(...args) { return window.GameModules.app.wechat.albumPromptHelpers.wechatAlbumPromptPreview.call(this, ...args); },
  wechatAlbumSelectedCharCount(...args) { return window.GameModules.app.wechat.albumPromptHelpers.wechatAlbumSelectedCharCount.call(this, ...args); },
  wechatAlbumIdentityInfo(...args) { return window.GameModules.app.wechat.albumPromptHelpers.wechatAlbumIdentityInfo.call(this, ...args); },
  wechatAlbumBodyText(...args) { return window.GameModules.app.wechat.albumPromptHelpers.wechatAlbumBodyText.call(this, ...args); },
  wechatAlbumPhotoPrompt(...args) { return window.GameModules.app.wechat.albumPromptHelpers.wechatAlbumPhotoPrompt.call(this, ...args); },

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
