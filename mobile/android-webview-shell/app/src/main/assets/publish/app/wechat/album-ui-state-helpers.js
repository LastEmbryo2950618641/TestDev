window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumUiStateHelpers = {
  openWechatAlbumDeleteConfirm(index = 0) {
    const list = this.wechatAlbumPhotoList();
    if (!list[index]) return;
    this.wechatAlbumDeleteConfirm = { open: true, index: Number(index) || 0 };
  },

  closeWechatAlbumDeleteConfirm() {
    this.wechatAlbumDeleteConfirm = { open: false, index: -1 };
  },

  wechatAlbumChoiceOpen() {
    this.wechatAlbumPromptStep = 'choice';
    this.wechatAlbumPromptDraft = { kind: 'natural', identityKeys: [], bodyKeys: [], customText: '', extraText: '' };
    this.wechatAlbumBodyFigureContext = null;
    this.wechatAlbumPromptOpen = true;
  },

  wechatAlbumChoiceClose() {
    if (!this.wechatAlbumGenerating) this.wechatAlbumPromptOpen = false;
  },
};
