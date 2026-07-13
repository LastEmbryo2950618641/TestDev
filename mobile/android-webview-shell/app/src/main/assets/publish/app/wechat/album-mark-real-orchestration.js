window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumMarkRealOrchestration = {
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
