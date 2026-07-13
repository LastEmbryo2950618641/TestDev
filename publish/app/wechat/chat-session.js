window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.chatSession = {
  selectContact(id) {
    this.wechatSelectedContact = id || this.wechatThreads()[0]?.id || 'player-self';
    const selected = (this.wechatUsers || []).find((item) => item.id === this.wechatSelectedContact);
    const bound = selected ? this.findWechatCharacterState?.(selected) : null;
    const profile = bound?.profile || this.rpgStates?.[this.wechatSelectedContact]?.profile;
    if (selected && bound?.profile && window.GameModules.characterProfile.isRoleCard?.(bound.profile)) {
      this.bindWechatCharacterState?.(bound, selected);
    } else if (selected && !window.GameModules.characterProfile.isConcreteName(profile?.name)) {
      this.ensureWechatUserProfile?.(selected, { generateIfMissing: true }).then(() => this.save?.()).catch((err) => console.warn('[微信] 选中联系人资料补全失败', err.code, err.message, err.stack));
    }
    const renamed = this.syncWechatContactsFromRpgStates?.();
    this.wechatUsers = (this.wechatUsers || []).map((item) => item.id === this.wechatSelectedContact ? { ...item, unread: 0 } : item);
    this.wechatView = 'chat';
    this.debugWechatMemory?.();
    if (renamed) this.save?.();
  },

  messageKey(contact) {
    if (!contact || contact.group) return contact?.id || 'group-main';
    return contact.id;
  },

  messages() {
    const target = this.wechatSelected();
    const key = this.wechatMessageKey(target);
    const stored = this.wechatMessagesByContact?.[key] || [];
    if (stored.length) return stored;
    if (target?.group) return [{ side: 'other', name: '系统', mark: '系', text: '新手机已激活，微信数据同步完成。' }];
    return [{ side: 'other', name: target?.name, mark: target?.mark, text: target?.latest || '资料已同步。' }];
  },

  updateLatest(id, latest, incoming = false) {
    this.wechatUsers = (this.wechatUsers || []).map((item) => item.id === id ? { ...item, latest: String(latest).slice(0, 80), unread: incoming && this.wechatSelectedContact !== id ? (Number(item.unread) || 0) + 1 : item.unread } : item);
  },
};
