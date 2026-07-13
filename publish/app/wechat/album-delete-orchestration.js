window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumDeleteOrchestration = {
  async confirmDeleteWechatAlbumPhoto() {
    const contact = this.wechatProfileContact();
    const index = Number(this.wechatAlbumDeleteConfirm?.index);
    const list = this.wechatAlbumPhotoList();
    if (!contact?.id || !Number.isInteger(index) || index < 0 || !list[index]) {
      this.closeWechatAlbumDeleteConfirm();
      return;
    }
    this.wechatAlbumPhotos = window.GameModules.app.wechat.albumPhotoStateHelpers.wechatAlbumPhotosAfterDelete(
      this.wechatAlbumPhotos,
      contact.id,
      list,
      index,
    );
    this.closeWechatAlbumDeleteConfirm();
    await this.save?.();
  },
};
