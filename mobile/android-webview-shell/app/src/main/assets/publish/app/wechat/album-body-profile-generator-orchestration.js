window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumBodyProfileGeneratorOrchestration = {
  async openBodyProfileImageGenerator(section = {}) {
    const kind = this.bodyProfileImageKind(section);
    const state = this.bodyProfileTargetState?.(section) || null;
    const contact = this.wechatContactFromState(state?.id || this.identityTargetId || 'player-self');
    this.wechatSelectedContact = contact.id;
    this.wechatAlbumBodyFigureContext = window.GameModules.app.wechat.albumBodyFigureContextHelpers.wechatAlbumBodyFigureContext.call(
      this,
      section,
      contact,
      kind,
    );
    this.wechatAlbumPromptOpen = true;
    this.wechatAlbumPromptError = '';
    await this.openWechatAlbumPromptEditor(kind);
  },
};
