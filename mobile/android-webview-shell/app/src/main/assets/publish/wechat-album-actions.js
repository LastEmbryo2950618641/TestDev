window.GameModules = window.GameModules || {};
// Compatibility facade: keep business logic in app/wechat modules.
window.GameModules.wechatAlbumActions = {
  openWechatContactProfile(...args) {
    return window.GameModules.app.wechat.albumProfileOrchestration.openWechatContactProfile.call(this, ...args);
  },

  backWechatContactProfile(...args) {
    return window.GameModules.app.wechat.albumProfileOrchestration.backWechatContactProfile.call(this, ...args);
  },

  openWechatAlbum(...args) { return window.GameModules.app.wechat.albumProfileOrchestration.openWechatAlbum.call(this, ...args); },
  wechatContactFromState(...args) { return window.GameModules.app.wechat.albumOrchestration.wechatContactFromState.call(this, ...args); },
  wechatProfileContact(...args) { return window.GameModules.app.wechat.albumOrchestration.wechatProfileContact.call(this, ...args); },
  wechatAlbumContact(...args) { return window.GameModules.app.wechat.albumOrchestration.wechatAlbumContact.call(this, ...args); },
  wechatAlbumPhotoListForContact(...args) { return window.GameModules.app.wechat.albumOrchestration.wechatAlbumPhotoListForContact.call(this, ...args); },
  wechatAlbumPhotoList(...args) { return window.GameModules.app.wechat.albumOrchestration.wechatAlbumPhotoList.call(this, ...args); },
  wechatAlbumPhoto(...args) { return window.GameModules.app.wechat.albumOrchestration.wechatAlbumPhoto.call(this, ...args); },
  refreshWechatAlbum(...args) { return window.GameModules.app.wechat.albumOrchestration.refreshWechatAlbum.call(this, ...args); },

  openWechatAlbumDeleteConfirm(...args) { return window.GameModules.app.wechat.albumUiStateHelpers.openWechatAlbumDeleteConfirm.call(this, ...args); },

  closeWechatAlbumDeleteConfirm(...args) { return window.GameModules.app.wechat.albumUiStateHelpers.closeWechatAlbumDeleteConfirm.call(this, ...args); },

  async confirmDeleteWechatAlbumPhoto(...args) {
    return window.GameModules.app.wechat.albumDeleteOrchestration.confirmDeleteWechatAlbumPhoto.call(this, ...args);
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

  async generateWechatAlbumSelectedPhoto(...args) {
    return window.GameModules.app.wechat.albumSelectedGenerationOrchestration.generateWechatAlbumSelectedPhoto.call(this, ...args);
  },
  async generateWechatAlbumPhotoFromSelectedPrompt(...args) {
    return window.GameModules.app.wechat.albumSelectedGenerationOrchestration.generateWechatAlbumPhotoFromSelectedPrompt.call(this, ...args);
  },
  async generateWechatAlbumPhoto(...args) {
    return window.GameModules.app.wechat.albumGenerationOrchestration.generateWechatAlbumPhoto.call(this, ...args);
  },

  async wechatDrawWithRetry(...args) { return window.GameModules.app.wechat.albumDrawHelpers.wechatDrawWithRetry.call(this, ...args); },

  async markWechatAlbumPhotoReal(...args) {
    return window.GameModules.app.wechat.albumMarkRealOrchestration.markWechatAlbumPhotoReal.call(this, ...args);
  },
};
