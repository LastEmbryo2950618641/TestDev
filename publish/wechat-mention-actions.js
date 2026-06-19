window.GameModules = window.GameModules || {};
window.GameModules.wechatMentionActions = {
  insertWechatMention(text = '') {
    const value = String(this.wechatInput || '');
    const gap = value && !/\s$/.test(value) ? ' ' : '';
    this.wechatInput = `${value}${gap}${text} `;
  },

  wechatImageMentionId(photo = {}, index = 0) {
    return String(photo.imageId || photo.taskId || `album-${index}`).trim();
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
    const out = [];
    const push = (item = {}) => {
      if (!item.url) return;
      const id = String(item.id || item.imageId || item.taskId || '').trim();
      if (!id || out.some((old) => old.id === id || old.url === item.url)) return;
      out.push({ ...item, id });
    };
    Object.entries(this.wechatMessagesByContact || {}).forEach(([contactId, list]) => (list || []).forEach((msg) => push({
      id: msg.imageId || msg.taskId,
      imageId: msg.imageId || '',
      taskId: msg.taskId || '',
      url: msg.imageUrl || '',
      description: msg.imageDescription || msg.imageIntent?.imageDescription || '',
      source: contactId === currentId ? '当前微信对话' : '其它微信对话',
    })));
    Object.entries(this.wechatAlbumPhotos || {}).forEach(([contactId, raw]) => (Array.isArray(raw) ? raw : (raw?.url ? [raw] : [])).forEach((photo, index) => push({
      id: this.wechatImageMentionId(photo, index),
      imageId: photo.imageId || '',
      taskId: photo.taskId || '',
      url: photo.url || '',
      description: photo.description || photo.prompt || '',
      source: contactId === currentId ? '当前联系人相册' : '其它联系人相册',
    })));
    return out;
  },

  wechatMentionContextText(playerText = '', currentId = '') {
    const contacts = this.wechatMentionedContacts(playerText);
    const images = this.wechatMentionedImages(playerText, currentId);
    if (!contacts.length && !images.length) return '无';
    const contactText = contacts.map((item) => `### @${item.name}\n${this.wechatContactProfileText?.(item) || item.name}`).join('\n');
    const imageText = images.map((item) => `- 图片ID：${item.id}\n  来源：${item.source || '微信图片'}\n  描述：${item.description || '无描述'}`).join('\n');
    return [contactText && `## @联系人\n${contactText}`, imageText && `## @图片\n${imageText}`].filter(Boolean).join('\n\n');
  },

  attachWechatMentionedImageIntent(result = {}, playerText = '', currentId = '') {
    const image = this.wechatMentionedImages(playerText, currentId)[0];
    if (!result?.imageIntent?.offer || !result.imageIntent.usesMentionedImage || !image?.url) return result;
    result.imageIntent = { ...result.imageIntent, baseImage: { id: image.id, url: image.url, description: image.description || '', source: image.source || '' } };
    return result;
  },

  wechatImageBasePhoto(msg = {}) {
    const base = msg.imageIntent?.baseImage || msg.baseImage;
    return base?.url ? { url: base.url, taskId: base.taskId || '', imageId: base.id || '', description: base.description || '' } : null;
  },
};
