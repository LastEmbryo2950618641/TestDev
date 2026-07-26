window.GameModules = window.GameModules || {};

/**
 * 微信好友申请：推演/Inbox 只能建 pending，玩家同意后才 addWechatUser。
 */
window.GameModules.wechatFriendRequest = {
  MAX: 40,

  normalize(raw = {}) {
    const fromName = String(raw.fromName || raw.name || '').trim().slice(0, 24);
    if (!fromName) return null;
    const fromCharacterId = String(raw.fromCharacterId || raw.characterId || raw.actorId || '').trim().slice(0, 80);
    const status = ['pending', 'accepted', 'rejected', 'expired'].includes(raw.status) ? raw.status : 'pending';
    const now = new Date().toISOString();
    return {
      id: String(raw.id || `wfr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`).slice(0, 80),
      fromCharacterId,
      fromName,
      relation: String(raw.relation || raw.relationToPlayer || '').trim().slice(0, 40),
      reason: String(raw.reason || raw.needPlayerWhy || raw.want || '').trim().slice(0, 160),
      source: String(raw.source || 'narration').trim().slice(0, 32),
      inboxId: String(raw.inboxId || '').trim().slice(0, 80),
      status,
      createdAt: String(raw.createdAt || now),
      resolvedAt: String(raw.resolvedAt || ''),
    };
  },

  isAlreadyContact(store = {}, request = {}) {
    const contacts = store.wechatContacts?.() || store.wechatUsers || [];
    const id = String(request.fromCharacterId || '').trim();
    const name = String(request.fromName || '').trim();
    return (Array.isArray(contacts) ? contacts : []).some((c) => {
      if (c?.group) return false;
      if (id && (c.characterId === id || c.id === id)) return true;
      if (name && c.name === name) return true;
      return false;
    });
  },

  hasPending(store = {}, request = {}) {
    const id = String(request.fromCharacterId || '').trim();
    const name = String(request.fromName || '').trim();
    return (store.wechatFriendRequests || []).some((item) => {
      if (item?.status !== 'pending') return false;
      if (id && item.fromCharacterId === id) return true;
      if (name && item.fromName === name) return true;
      return false;
    });
  },
};

window.GameModules.wechatFriendRequestActions = {
  wechatFriendRequestPendingCount() {
    return (this.wechatFriendRequests || []).filter((item) => item?.status === 'pending').length;
  },

  wechatFriendRequestPendingList() {
    return (this.wechatFriendRequests || []).filter((item) => item?.status === 'pending');
  },

  openWechatFriendRequests() {
    this.wechatTab = 'contacts';
    this.wechatView = 'friendRequests';
  },

  requestWechatFriend(raw = {}) {
    const tool = window.GameModules.wechatFriendRequest;
    const req = tool.normalize(raw);
    if (!req) return null;
    if (tool.isAlreadyContact(this, req)) return null;
    if (tool.hasPending(this, req)) {
      return (this.wechatFriendRequests || []).find((item) => (
        item.status === 'pending'
        && ((req.fromCharacterId && item.fromCharacterId === req.fromCharacterId) || item.fromName === req.fromName)
      )) || null;
    }
    this.wechatFriendRequests = [...(this.wechatFriendRequests || []), req].slice(-tool.MAX);
    return req;
  },

  async acceptWechatFriendRequest(requestId = '') {
    const id = String(requestId || '').trim();
    const req = (this.wechatFriendRequests || []).find((item) => item.id === id);
    if (!req || req.status !== 'pending') return null;
    const contact = await this.addWechatUser?.({
      id: req.fromCharacterId || undefined,
      characterId: req.fromCharacterId || undefined,
      name: req.fromName,
      relation: req.relation || '微信联系人',
      source: 'friend-request',
      context: req.reason,
    }, { generateProfile: false, save: false });
    const now = new Date().toISOString();
    this.wechatFriendRequests = (this.wechatFriendRequests || []).map((item) => (
      item.id === id ? { ...item, status: 'accepted', resolvedAt: now } : item
    ));
    // 回写介绍卡/角色卡：wechat 链接、reach、lastContact、议程冷却
    try {
      await window.GameModules.socialInbox?.applyOutreachWriteback?.(this, {
        actorId: req.fromCharacterId,
        actorName: req.fromName,
        want: req.reason,
        needPlayerWhy: req.reason,
        urgency: 0.2,
        agenda: {
          short: req.reason || '已通过微信好友申请',
          needPlayer: false,
          needPlayerWhy: '',
          urgency: 0.15,
        },
      }, {
        channel: 'wechat',
        atIso: now,
        addWechatReach: true,
        wechatContactId: contact?.id || '',
        cooldownHours: 6,
      });
    } catch (err) {
      console.warn('[微信申请] 回写人物状态失败:', err?.message || err);
    }
    await this.save?.();
    return contact;
  },

  async rejectWechatFriendRequest(requestId = '') {
    const id = String(requestId || '').trim();
    const now = new Date().toISOString();
    let found = null;
    this.wechatFriendRequests = (this.wechatFriendRequests || []).map((item) => {
      if (item.id !== id || item.status !== 'pending') return item;
      found = { ...item, status: 'rejected', resolvedAt: now };
      return found;
    });
    if (found) await this.save?.();
    return found;
  },

  /** 从已 prepared 的 Social Inbox 条目生成微信申请（无微信且 mayRequestWechat） */
  promoteSocialInboxWechatRequests(items = null) {
    const list = Array.isArray(items)
      ? items
      : (this.socialInbox || []).filter((item) => item && (this.socialInboxPreparedIds || []).includes(item.id));
    const created = [];
    list.forEach((item) => {
      if (!item?.mayRequestWechat || item.hasWechatContact) return;
      const req = this.requestWechatFriend?.({
        fromCharacterId: item.actorId,
        fromName: item.actorName,
        relation: item.relationToPlayer,
        reason: item.needPlayerWhy || item.want || '希望添加你为微信好友',
        source: 'social-inbox',
        inboxId: item.id,
      });
      if (req) created.push(req);
    });
    return created;
  },
};
