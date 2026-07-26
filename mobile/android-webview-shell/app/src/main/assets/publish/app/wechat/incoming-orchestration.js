window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.incomingOrchestration = {
  async applyWechatActions(actions = []) {
    const list = Array.isArray(actions) ? actions : [];
    for (const action of list.slice(0, 8)) await this.applyWechatIncomingAction(action);
  },

  async applyWechatIncomingAction(action = {}) {
    const outreach = window.GameModules.wechatOutreachContext;
    if (outreach?.shouldSkipAiIncoming?.(this, action)) return;
    const type = String(action.action || action.method || '').trim();
    if (type === 'requestWechatFriend' || type === 'requestFriend') {
      this.requestWechatFriend?.({
        fromCharacterId: action.characterId || action.contactId || action.fromCharacterId || '',
        fromName: action.name || action.fromName || action.contactId || '',
        relation: action.relation || action.relationToPlayer || '',
        reason: action.reason || action.text || action.message || '希望添加你为微信好友',
        source: action.source || 'narration',
        inboxId: action.inboxId || '',
        sourceRecordId: action.sourceRecordId || outreach?.resolveSourceRecordId?.(this) || '',
        intentChain: action.intentChain || outreach?.intentChainFromReason?.(action.reason || action.text || ''),
      });
      return;
    }
    if (!['sendIncomingNow', 'sendIncomingPast'].includes(type)) return;
    const contact = this.findWechatIncomingContact(action.contactId || action.characterId || action.name);
    if (!contact) return;
    const state = this.itemSkillState?.(contact.characterId || contact.id) || await this.ensureWechatUserProfile?.(contact);
    const time = type === 'sendIncomingPast' ? this.wechatPastMessageTime(action.timeIso) : null;
    const text = String(action.text || '').trim().slice(0, 180);
    if (!text) return;
    const sourceRecordId = outreach?.resolveSourceRecordId?.(this, action.sourceRecordId) || '';
    const intentChain = outreach?.normalizeIntentChain?.(action.intentChain)
      || outreach?.intentChainFromReason?.(action.reason || text);
    const openedAt = type === 'sendIncomingPast' && action.timeIso
      ? new Date(action.timeIso).toISOString()
      : ((this.phoneDate?.() || new Date()).toISOString?.() || new Date().toISOString());
    this.appendWechatMessage(contact.id, {
      side: 'other',
      name: state?.profile?.name || contact.name,
      mark: (state?.profile?.name || contact.name || '').slice(0, 1),
      text,
      characterId: state?.id || contact.characterId || contact.id,
      time,
      sourceRecordId,
      intentChain,
      openedAt,
      outreachSource: 'inference',
    });
    const outreachOpen = { sourceRecordId, intentChain, openedAt, source: 'incoming' };
    if (Array.isArray(this.wechatUsers)) {
      this.wechatUsers = this.wechatUsers.map((c) => (c.id === contact.id ? { ...c, outreachOpen } : c));
    }
    if (state?.id) await window.GameModules.characterMemory?.recordWechatExchange?.(this, { ...contact, id: state.id, characterId: state.id }, '未回复', text, { mood: '思念主动联系', impression: 40 });
  },

  findWechatIncomingContact(value = '') {
    const key = String(value || '').trim();
    return (this.wechatContacts?.() || []).find((c) => !c.group && (c.id === key || c.characterId === key || c.name === key)) || null;
  },

  wechatPastMessageTime(timeIso = '') {
    const d = new Date(timeIso);
    const safe = Number.isFinite(d.getTime()) ? d : (this.phoneDate?.() || new Date());
    return { label: this.wechatPastLabel(safe), display: this.wechatTimeDisplay?.(safe) || '', value: this.wechatTimeValue?.(safe) || {} };
  },

  wechatPastLabel(d) {
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${week} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  },
};
