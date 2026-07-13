window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.imageAlbumHelpers = {
  wechatRealPhotoForContact(characterId = this.wechatSelectedContact) {
      const raw = this.wechatAlbumPhotos?.[characterId];
      const list = Array.isArray(raw) ? raw : (raw?.url ? [raw] : []);
      return list.find((item) => item?.url && item.real) || null;
    },

  addWechatImageToAlbum(characterId = '', photo = {}) {
      const id = characterId || this.wechatSelectedContact;
      if (!id || !photo.url) return;
      const raw = this.wechatAlbumPhotos?.[id];
      const list = Array.isArray(raw) ? raw.filter((item) => item?.url) : (raw?.url ? [raw] : []);
      if (list.some((item) => item.url === photo.url)) return;
      this.wechatAlbumPhotos = { ...(this.wechatAlbumPhotos || {}), [id]: [{
        url: photo.url,
        kind: 'wechat-image',
        taskId: photo.taskId || '',
        real: false,
        source: 'wechat-chat',
        imageId: photo.imageId || '',
        prompt: photo.prompt || '',
        tags: photo.tags || '',
        description: photo.description || '',
        createdAt: new Date().toISOString(),
      }, ...list] };
    },
};
