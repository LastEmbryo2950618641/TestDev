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
    const outreach = window.GameModules.wechatOutreachContext;
    const intentChain = outreach?.normalizeIntentChain?.(raw.intentChain)
      || outreach?.intentChainFromReason?.(raw.reason || raw.needPlayerWhy || raw.want || '');
    return {
      id: String(raw.id || `wfr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`).slice(0, 80),
      fromCharacterId,
      fromName,
      relation: String(raw.relation || raw.relationToPlayer || '').trim().slice(0, 40),
      reason: String(raw.reason || raw.needPlayerWhy || raw.want || intentChain?.whyPlayer || '').trim().slice(0, 160),
      source: String(raw.source || 'narration').trim().slice(0, 32),
      inboxId: String(raw.inboxId || '').trim().slice(0, 80),
      sourceRecordId: String(raw.sourceRecordId || raw.recordId || raw.logId || '').trim().slice(0, 120),
      intentChain,
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
    const outreach = window.GameModules.wechatOutreachContext;
    const sourceRecordId = outreach?.resolveSourceRecordId?.(this, raw.sourceRecordId) || raw.sourceRecordId || '';
    if (!String(sourceRecordId || '').trim()) return null;
    const withMeta = {
      ...raw,
      sourceRecordId,
      intentChain: raw.intentChain || outreach?.intentChainFromReason?.(raw.reason || raw.needPlayerWhy || raw.want || ''),
    };
    const req = tool.normalize(withMeta);
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
    const roleId = String(req.fromCharacterId || '').trim();
    const validId = window.GameModules.wechatActions?.isWechatContactCharacterId?.(roleId);
    if (!roleId || !validId) {
      this.wechatError = '该好友申请缺少有效角色ID，无法加入通讯录。';
      console.warn('[微信] 同意好友申请失败：无有效角色ID', req?.fromName, roleId);
      return null;
    }
    const outreach = window.GameModules.wechatOutreachContext;
    const intentChain = outreach?.normalizeIntentChain?.(req.intentChain)
      || outreach?.intentChainFromReason?.(req.reason);
    const sourceRecordId = String(req.sourceRecordId || '').trim();
    const openedAt = String(req.createdAt || new Date().toISOString());
    const contact = await this.addWechatUser?.({
      id: roleId,
      characterId: roleId,
      name: req.fromName,
      relation: req.relation || '微信联系人',
      source: 'friend-request',
      context: req.reason,
      outreachOpen: {
        status: 'open',
        sourceRecordId,
        intentChain,
        openedAt,
        source: 'friend-accept',
      },
    }, { generateProfile: false, save: false });
    if (!contact) {
      this.wechatError = '无法写入通讯录：角色ID无效。';
      return null;
    }
    contact.outreachOpen = {
      status: 'open',
      sourceRecordId,
      intentChain,
      openedAt,
      source: 'friend-accept',
    };
    if (Array.isArray(this.wechatUsers)) {
      this.wechatUsers = this.wechatUsers.map((c) => (c.id === contact.id ? { ...c, outreachOpen: contact.outreachOpen } : c));
    }
    const now = new Date().toISOString();
    this.wechatFriendRequests = (this.wechatFriendRequests || []).map((item) => (
      item.id === id ? { ...item, status: 'accepted', resolvedAt: now, intentChain, sourceRecordId } : item
    ));
    // 回写：保留 needPlayer，等微信把事谈完再冷却
    try {
      await window.GameModules.socialInbox?.applyOutreachWriteback?.(this, {
        actorId: req.fromCharacterId,
        actorName: req.fromName,
        want: req.reason,
        needPlayerWhy: req.reason,
        urgency: 0.45,
        agenda: {
          short: req.reason || '已通过微信好友申请，待微信对接',
          needPlayer: true,
          needPlayerWhy: req.reason || intentChain?.whyPlayer || '等待微信对接',
          urgency: 0.45,
        },
      }, {
        channel: 'wechat',
        atIso: now,
        addWechatReach: true,
        wechatContactId: contact?.id || '',
        cooldownHours: 0,
        keepNeedPlayer: true,
      });
    } catch (err) {
      console.warn('[微信申请] 回写人物状态失败:', err?.message || err);
    }
    await this.save?.();
    const playerText = outreach?.ACCEPT_PLAYER_TEXT || '我通过了你的好友申请';
    if (contact && typeof this.replyWechatContact === 'function') {
      try {
        this.appendWechatMessage?.(contact.id, {
          side: 'self',
          name: this.playerDisplayCharacter?.().name || this.playerName || '我',
          mark: '我',
          text: playerText,
        });
        await this.replyWechatContact(contact, playerText);
      } catch (err) {
        console.warn('[微信申请] 通过后首回失败:', err?.message || err);
      }
    }
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
    const outreach = window.GameModules.wechatOutreachContext;
    const list = Array.isArray(items)
      ? items
      : (this.socialInbox || []).filter((item) => item && (this.socialInboxPreparedIds || []).includes(item.id));
    const created = [];
    list.forEach((item) => {
      if (!item?.mayRequestWechat || item.hasWechatContact) return;
      const intentChain = outreach?.normalizeIntentChain?.(item.intentChain)
        || outreach?.intentChainFromInboxItem?.(item);
      const req = this.requestWechatFriend?.({
        fromCharacterId: item.actorId,
        fromName: item.actorName,
        relation: item.relationToPlayer,
        reason: item.needPlayerWhy || item.want || intentChain?.whyPlayer || '希望添加你为微信好友',
        source: 'social-inbox',
        inboxId: item.id,
        sourceRecordId: outreach?.resolveSourceRecordId?.(this, item.sourceRecordId) || '',
        intentChain,
      });
      if (req) created.push(req);
    });
    return created;
  },
};
