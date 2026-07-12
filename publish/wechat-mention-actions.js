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
    this.insertWechatMention(`@图片${this.wechatMessageImageMentionId(msg, index)}`);
  },

  wechatImageMentionId(photo = {}, index = 0) {
    return callWechatMentionIdHelper('wechatImageMentionId', this, photo, index);
  },

  wechatMessageMentionId(msg = {}, index = 0) {
    const raw = `${msg.side || 'msg'}-${msg.at || ''}-${msg.text || msg.imageDescription || ''}-${index}`;
    const seed = window.GameModules.rpgState?.seed?.(raw) || index;
    return String(msg.messageId || `msg-${seed}`).trim();
  },

  wechatMessageImageMentionId(msg = {}, index = 0) {
    return callWechatMentionIdHelper('wechatMessageImageMentionId', this, msg, index);
  },

  wechatMentionedContacts(text = '') {
    const raw = String(text || '');
    return (this.wechatContacts?.() || []).filter((item) => !item.group && item.name && raw.includes(`@${item.name}`)).slice(0, 5);
  },

  wechatMentionedImages(text = '', currentId = '') {
    const ids = [];
    const raw = String(text || '');
    raw.replace(/@(?:图片)?([A-Za-z0-9_-]+)|图片\[([^\]]+)\]/g, (_, a, b) => { ids.push(String(a || b || '').trim()); return ''; });
    if (!ids.length) return [];
    const sources = this.wechatImageMentionSources(currentId);
    return ids.map((id) => sources.find((item) => [item.id, item.imageId, item.taskId].includes(id))).filter(Boolean).slice(0, 4);
  },

  wechatImageMentionSources(currentId = '') {
    return callWechatMentionViewHelper('wechatImageMentionSources', this, currentId);
  },

  wechatMentionContextText(playerText = '', currentId = '') {
    return callWechatMentionViewHelper('wechatMentionContextText', this, playerText, currentId);
  },

  attachWechatMentionedImageIntent(result = {}, playerText = '', currentId = '') {
    const image = this.wechatMentionedImages(playerText, currentId)[0];
    if (!result?.imageIntent?.offer || !result.imageIntent.usesMentionedImage || !image?.url) return result;
    result.imageIntent = { ...result.imageIntent, baseImage: { id: image.id, url: image.url, description: image.description || '', source: image.source || '' } };
    return result;
  },

  wechatImageBasePhoto(msg = {}) {
    return callWechatMentionBasePhotoHelper('wechatImageBasePhoto', this, msg);
  },
};
