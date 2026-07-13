window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.mentionReferenceHelpers = {
  wechatMessageMentionId(msg = {}, index = 0) {
    const raw = `${msg.side || 'msg'}-${msg.at || ''}-${msg.text || msg.imageDescription || ''}-${index}`;
    const seed = window.GameModules.rpgState?.seed?.(raw) || index;
    return String(msg.messageId || `msg-${seed}`).trim();
  },

  wechatMentionedImages(text = '', currentId = '') {
    const ids = [];
    const raw = String(text || '');
    raw.replace(/@(?:图片)?([A-Za-z0-9_-]+)|图片\[([^\]]+)\]/g, (_, a, b) => { ids.push(String(a || b || '').trim()); return ''; });
    if (!ids.length) return [];
    const sources = this.wechatImageMentionSources(currentId);
    return ids.map((id) => sources.find((item) => [item.id, item.imageId, item.taskId].includes(id))).filter(Boolean).slice(0, 4);
  },

  attachWechatMentionedImageIntent(result = {}, playerText = '', currentId = '') {
    const image = this.wechatMentionedImages(playerText, currentId)[0];
    if (!result?.imageIntent?.offer || !result.imageIntent.usesMentionedImage || !image?.url) return result;
    result.imageIntent = { ...result.imageIntent, baseImage: { id: image.id, url: image.url, description: image.description || '', source: image.source || '' } };
    return result;
  },
};
