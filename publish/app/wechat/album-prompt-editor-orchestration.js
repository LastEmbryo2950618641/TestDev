window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumPromptEditorOrchestration = {
  async openWechatAlbumPromptEditor(kind = 'natural') {
    const contact = this.wechatAlbumContact();
    if (contact?.id === 'player-self') await this.ensurePlayerRpgState?.();
    else await this.ensureWechatUserProfile?.(contact);
    const options = this.wechatAlbumPromptOptions(kind);
    const draft = window.GameModules.app.wechat.albumPromptEditorHelpers.wechatAlbumPromptEditorDraft.call(
      this,
      kind,
      this.wechatAlbumBodyFigureContext,
    );
    draft.identityKeys = options.identity.map((item) => item.key);
    draft.bodyKeys = options.body.map((item) => item.key);
    this.wechatAlbumPromptDraft = draft;
    this.wechatAlbumPromptStep = 'edit';
  },
};
