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
    this.wechatAlbumPhotos = window.GameModules.app.wechat.albumPhotoStateHelpers.wechatAlbumPhotosAfterDelete(
      this.wechatAlbumPhotos,
      contact.id,
      list,
      index,
    );
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

  async saveGeneratedBodyFigureAsset(...args) {
    return window.GameModules.app.wechat.albumBodyFigureAssetOrchestration.saveGeneratedBodyFigureAsset.call(this, ...args);
  },

  async openBodyProfileImageGenerator(...args) {
    return window.GameModules.app.wechat.albumBodyProfileGeneratorOrchestration.openBodyProfileImageGenerator.call(this, ...args);
  },

  async openWechatAlbumPromptEditor(...args) {
    return window.GameModules.app.wechat.albumPromptEditorOrchestration.openWechatAlbumPromptEditor.call(this, ...args);
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
      this.wechatAlbumPrompts = window.GameModules.app.wechat.albumPromptListHelpers.wechatAlbumPromptsAfterSelectedUpdate(
        this.wechatAlbumPrompts,
        contact.id,
        this.wechatAlbumPromptList(contact),
        selectedPrompt.id,
        prompt,
        negativePrompt,
      );
      await this.save?.();
    }
    await this.generateWechatAlbumPhoto(kind, { prompt, negativePrompt });
  },
  async generateWechatAlbumPhoto(...args) {
    return window.GameModules.app.wechat.albumGenerationOrchestration.generateWechatAlbumPhoto.call(this, ...args);
  },

  async wechatDrawWithRetry(...args) { return window.GameModules.app.wechat.albumDrawHelpers.wechatDrawWithRetry.call(this, ...args); },

  async markWechatAlbumPhotoReal(index = 0) {
    const contact = this.wechatProfileContact();
    const list = this.wechatAlbumPhotoList();
    if (!contact || !list[index]) return;
    this.wechatAlbumPhotos = window.GameModules.app.wechat.albumPhotoStateHelpers.wechatAlbumPhotosAfterMarkReal(
      this.wechatAlbumPhotos,
      contact.id,
      list,
      index,
    );
    await this.save?.();
    await this.autoCaptureWechatAvatar?.(index);
  },
};
