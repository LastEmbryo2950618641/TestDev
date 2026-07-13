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
      this.ensureWechatUserProfile?.(selected, { generateIfMissing: true }).then(() => this.save?.()).catch((err) => console.warn('[寰俊] 閫変腑鑱旂郴浜鸿祫鏂欒ˉ鍏ㄥけ璐?', err.code, err.message, err.stack));
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
    if (target?.group) return [{ side: 'other', name: '绯荤粺', mark: '绯?', text: '鏂版墜鏈哄凡婵€娲伙紝寰俊鏁版嵁鍚屾瀹屾垚銆?' }];
    return [{ side: 'other', name: target?.name, mark: target?.mark, text: target?.latest || '璧勬枡宸插悓姝ャ€?' }];
  },

  updateLatest(id, latest, incoming = false) {
    this.wechatUsers = (this.wechatUsers || []).map((item) => item.id === id ? { ...item, latest: String(latest).slice(0, 80), unread: incoming && this.wechatSelectedContact !== id ? (Number(item.unread) || 0) + 1 : item.unread } : item);
  },
};
