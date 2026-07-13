window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.mentionViewHelpers = {
  wechatMentionedContacts(text = '') {
    const raw = String(text || '');
    return (this.wechatContacts?.() || []).filter((item) => !item.group && item.name && raw.includes('@' + item.name)).slice(0, 5);
  },

  wechatMentionedMessages(text = '', currentId = '') {
    const ids = [];
    String(text || '').replace(/@消息([A-Za-z0-9_-]+)/g, (_, id) => { ids.push(String(id || '').trim()); return ''; });
    if (!ids.length) return [];
    const sources = this.wechatMessageMentionSources(currentId);
    return ids.map((id) => sources.find((item) => item.id === id)).filter(Boolean).slice(0, 4);
  },

  wechatMessageMentionSources(currentId = '') {
    const list = this.wechatMessagesByContact?.[currentId] || [];
    return list.map((msg, index) => ({
      id: this.wechatMessageMentionId(msg, index),
      text: msg.imageRecord || msg.text || msg.imageDescription || '',
      side: msg.side || '',
      sender: msg.side === 'self' ? '玩家' : (msg.name || '联系人'),
      time: msg.atDisplay || msg.at || '',
    })).filter((item) => item.text).slice(-12);
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
};
