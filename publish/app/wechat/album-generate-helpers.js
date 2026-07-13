window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumGenerateHelpers = {
  wechatAlbumGenerationStartState(currentRequestId = 0) {
    return {
      requestId: (currentRequestId || 0) + 1,
      generating: true,
      promptOpen: false,
    };
  },

  wechatAlbumBodyFigureContextForContact(contact = {}) {
    return this.wechatAlbumBodyFigureContext?.characterId === contact.id
      ? { ...this.wechatAlbumBodyFigureContext }
      : null;
  },

  wechatAlbumDrawOptions(prompt = '', negativePrompt = '') {
    return {
      prompt: String(prompt || '').slice(0, 2000),
      dimension: '2:3',
      model: this.selectedDrawModelId?.() || 'anime',
      negativePrompt: String(negativePrompt || '').slice(0, 2000),
    };
  },

  wechatAlbumGeneratedPhoto(contact = {}, kind = 'natural', result = {}, savedFigure = null, bodyFigureContext = null) {
    const url = result?.images?.[0] || '';
    return {
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
  },
};
