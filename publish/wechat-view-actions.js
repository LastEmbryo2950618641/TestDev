window.GameModules = window.GameModules || {};
window.GameModules.wechatViewActions = {
  wechatContacts() {
    const group = this.defaultWechatGroup?.() || { id: 'group-main', name: '操控者交流群', mark: '群', group: true };
    const users = (this.wechatUsers || []).map((contact) => this.displayWechatContact?.(contact) || contact);
    return [group, ...users];
  },

  wechatThreads() {
    return this.wechatContacts().map((contact) => {
      const key = this.wechatMessageKey?.(contact) || contact.id;
      const latest = this.wechatMessagesByContact?.[key]?.slice(-1)?.[0]?.text || contact.latest || '';
      return { ...contact, latest: String(latest).slice(0, 80) };
    });
  },

  wechatSelected() {
    const contacts = this.wechatContacts();
    const selectedId = this.wechatSelectedContact || 'group-main';
    return contacts.find((contact) => contact.id === selectedId) || contacts[0] || { id: 'group-main', name: '微信', mark: '微', group: true };
  },

  setWechatTab(tab) {
    this.wechatTab = tab || 'chats';
    this.wechatView = 'home';
  },
};
