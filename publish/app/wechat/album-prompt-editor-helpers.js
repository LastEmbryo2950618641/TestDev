window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumPromptEditorHelpers = {
  wechatAlbumPromptEditorDraft(kind = 'natural', bodyFigureContext = null) {
    return {
      kind,
      identityKeys: [],
      bodyKeys: [],
      customText: '',
      extraText: '',
      bodyFigureContext: bodyFigureContext?.kind === kind ? { ...bodyFigureContext } : null,
    };
  },
};
