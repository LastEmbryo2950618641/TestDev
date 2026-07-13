window.GameModules = window.GameModules || {};
function callWechatMentionViewHelper(name, context, ...args) {
  return window.GameModules.app.wechat.mentionViewHelpers[name].call(context, ...args);
}
function callWechatMentionBasePhotoHelper(name, context, ...args) {
  return window.GameModules.app.wechat.mentionBasePhotoHelper[name].call(context, ...args);
}

function callWechatMentionIdHelper(name, context, ...args) {
  return window.GameModules.app.wechat.mentionBasePhotoHelper[name].call(context, ...args);
}

function callWechatMentionReferenceHelper(name, context, ...args) {
  return window.GameModules.app.wechat.mentionReferenceHelpers[name].call(context, ...args);
}

window.GameModules.wechatMentionActions = {
  insertWechatMention(text = '') {
    const value = String(this.wechatInput || '');
    const gap = value && !/\s$/.test(value) ? ' ' : '';
    this.wechatInput = `${value}${gap}${text} `;
  },

  mentionWechatMessage(msg = {}, index = 0) {
    this.insertWechatMention(`@消息${this.wechatMessageMentionId(msg, index)}`);
  },

  mentionWechatImage(msg = {}, index = 0) {
    return callWechatMentionIdHelper('mentionWechatImage', this, msg, index);
  },

  wechatImageMentionId(photo = {}, index = 0) {
    return callWechatMentionIdHelper('wechatImageMentionId', this, photo, index);
  },

  wechatMessageMentionId(msg = {}, index = 0) {
    return callWechatMentionReferenceHelper('wechatMessageMentionId', this, msg, index);
  },

  wechatMessageImageMentionId(msg = {}, index = 0) {
    return callWechatMentionIdHelper('wechatMessageImageMentionId', this, msg, index);
  },

  wechatMentionedContacts(text = '') {
    return callWechatMentionViewHelper('wechatMentionedContacts', this, text);
  },

  wechatMentionedImages(text = '', currentId = '') {
    return callWechatMentionReferenceHelper('wechatMentionedImages', this, text, currentId);
  },

  wechatImageMentionSources(currentId = '') {
    return callWechatMentionViewHelper('wechatImageMentionSources', this, currentId);
  },

  wechatMentionContextText(playerText = '', currentId = '') {
    return callWechatMentionViewHelper('wechatMentionContextText', this, playerText, currentId);
  },

  attachWechatMentionedImageIntent(result = {}, playerText = '', currentId = '') {
    return callWechatMentionReferenceHelper('attachWechatMentionedImageIntent', this, result, playerText, currentId);
  },

  wechatImageBasePhoto(msg = {}) {
    return callWechatMentionBasePhotoHelper('wechatImageBasePhoto', this, msg);
  },
};
