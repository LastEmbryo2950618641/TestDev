window.GameModules = window.GameModules || {};
function callWechatImageRecordHelper(name, context, ...args) {
  return window.GameModules.app.wechat.imageRecordHelpers[name].call(context, ...args);
}

function callWechatImageUiHelper(name, context, ...args) {
  return window.GameModules.app.wechat.imageUiHelpers[name].call(context, ...args);
}

function callWechatImageAlbumHelper(name, context, ...args) {
  return window.GameModules.app.wechat.imageAlbumHelpers[name].call(context, ...args);
}

function callWechatImagePromptHelper(name, context, ...args) {
  return window.GameModules.app.wechat.imagePromptHelpers[name].call(context, ...args);
}

function callWechatImageReceiveOrchestration(name, context, ...args) {
  return window.GameModules.app.wechat.imageReceiveOrchestration[name].call(context, ...args);
}

function callWechatImageOfferOrchestration(name, context, ...args) {
  return window.GameModules.app.wechat.imageOfferOrchestration[name].call(context, ...args);
}

window.GameModules.wechatImageActions = {
  async appendWechatPendingImageMessage(characterId, state = {}, contact = {}, imageIntent = {}) {
    return callWechatImageOfferOrchestration('appendWechatPendingImageMessage', this, characterId, state, contact, imageIntent);
  },

  async recordWechatImageOffer(contact = {}, time = {}, imageRecord = '', imageId = '', imageIntent = {}) {
    return callWechatImageOfferOrchestration('recordWechatImageOffer', this, contact, time, imageRecord, imageId, imageIntent);
  },

  wechatImageRecordText(contactName, label, imageId, imageDescription, read = false) {
    return callWechatImageRecordHelper('wechatImageRecordText', this, contactName, label, imageId, imageDescription, read);
  },

  wechatImageReadRecord(msg = {}) {
    return callWechatImageRecordHelper('wechatImageReadRecord', this, msg);
  },

  async replaceWechatImageRecord(msg = {}, readRecord = '') {
    return callWechatImageRecordHelper('replaceWechatImageRecord', this, msg, readRecord);
  },

  replaceWechatImageRecordInMemory(memory = {}, oldRecord = '', readRecord = '') {
    return callWechatImageRecordHelper('replaceWechatImageRecordInMemory', this, memory, oldRecord, readRecord);
  },

  replaceWechatImageRecordInWorldline(oldRecord = '', readRecord = '') {
    return callWechatImageRecordHelper('replaceWechatImageRecordInWorldline', this, oldRecord, readRecord);
  },

  openWechatImageConfirm(msg = {}) {
    return callWechatImageUiHelper('openWechatImageConfirm', this, msg);
  },

  closeWechatImageConfirm() {
    return callWechatImageUiHelper('closeWechatImageConfirm', this);
  },

  openWechatImagePreview(url = '', title = '图片预览') {
    return callWechatImageUiHelper('openWechatImagePreview', this, url, title);
  },

  closeWechatImagePreview() {
    return callWechatImageUiHelper('closeWechatImagePreview', this);
  },

  wechatImageConfirmPromptText(msg = this.wechatImageConfirmMessage) {
    return callWechatImageUiHelper('wechatImageConfirmPromptText', this, msg);
  },

  updateWechatImageMessage(targetMsg = {}, patch = {}) {
    return callWechatImageUiHelper('updateWechatImageMessage', this, targetMsg, patch);
  },

  wechatRealPhotoForContact(characterId = this.wechatSelectedContact) {
    return callWechatImageAlbumHelper('wechatRealPhotoForContact', this, characterId);
  },

  addWechatImageToAlbum(characterId = '', photo = {}) {
    return callWechatImageAlbumHelper('addWechatImageToAlbum', this, characterId, photo);
  },

  wechatMemorySections(characterId = '') {
    return callWechatImagePromptHelper('wechatMemorySections', this, characterId);
  },

  wechatWearingContext(state = {}) {
    return callWechatImagePromptHelper('wechatWearingContext', this, state);
  },

  cleanWechatImageTags(text = '') {
    return callWechatImagePromptHelper('cleanWechatImageTags', this, text);
  },

  async buildWechatImageTags(msg = {}) {
    return callWechatImagePromptHelper('buildWechatImageTags', this, msg);
  },
  async confirmWechatImageReceive() {
    return callWechatImageReceiveOrchestration('confirmWechatImageReceive', this);
  },

};
