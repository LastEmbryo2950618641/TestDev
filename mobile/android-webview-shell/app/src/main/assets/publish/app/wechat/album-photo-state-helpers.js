window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumPhotoStateHelpers = {
  wechatAlbumPhotosAfterDelete(photosByContact = {}, contactId = '', list = [], index = -1) {
    return {
      ...(photosByContact || {}),
      [contactId]: (Array.isArray(list) ? list : []).filter((_, i) => i !== index),
    };
  },

  wechatAlbumPhotosAfterInsert(photosByContact = {}, contactId = '', list = [], photo = null) {
    return {
      ...(photosByContact || {}),
      [contactId]: [photo, ...(Array.isArray(list) ? list : [])],
    };
  },

  wechatAlbumPhotosAfterMarkReal(photosByContact = {}, contactId = '', list = [], index = -1) {
    return {
      ...(photosByContact || {}),
      [contactId]: (Array.isArray(list) ? list : []).map((photo, i) => (
        i === index ? { ...photo, real: true } : photo
      )),
    };
  },
};
