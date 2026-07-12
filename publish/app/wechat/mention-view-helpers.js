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
};
