window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumProfileOrchestration = {
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
    if (this.wechatAlbumMode === 'album') {
      this.wechatAlbumMode = 'profile';
      return;
    }
    this.wechatView = 'home';
    this.wechatAlbumMode = 'profile';
  },

  openWechatAlbum() {
    this.wechatAlbumMode = 'album';
  },
};
