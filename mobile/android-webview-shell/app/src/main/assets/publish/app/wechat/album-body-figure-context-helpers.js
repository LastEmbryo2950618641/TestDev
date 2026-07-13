window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumBodyFigureContextHelpers = {
  wechatAlbumBodyFigureContext(section = {}, contact = {}, kind = 'natural') {
    return {
      characterId: contact.id,
      kind,
      sectionTitle: String(section?.title || ''),
      startedAt: Date.now(),
    };
  },
};
