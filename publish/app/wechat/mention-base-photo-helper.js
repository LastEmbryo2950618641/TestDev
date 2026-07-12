window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.mentionBasePhotoHelper = {
  wechatImageBasePhoto(msg = {}) {
    const base = msg.imageIntent?.baseImage || msg.baseImage;
    return base?.url ? { url: base.url, taskId: base.taskId || '', imageId: base.id || '', description: base.description || '' } : null;
  },
  wechatImageMentionId(photo = {}, index = 0) {
    return String(photo.imageId || photo.taskId || ('album-' + index)).trim();
  },

  wechatMessageImageMentionId(msg = {}, index = 0) {
    return String(msg.imageId || msg.taskId || ('chat-img-' + this.wechatMessageMentionId(msg, index))).trim();
  },

};
