window.GameModules = window.GameModules || {};

window.GameModules.wechatIncomingActions = {
  async applyWechatActions(actions = []) {
    const list = Array.isArray(actions) ? actions : [];
    for (const action of list.slice(0, 6)) await this.applyWechatIncomingAction(action);
  },

  async applyWechatIncomingAction(action = {}) {
    const type = String(action.action || action.method || '').trim();
    if (!['sendIncomingNow', 'sendIncomingPast'].includes(type)) return;
    const contact = this.findWechatIncomingContact(action.contactId || action.characterId || action.name);
    if (!contact) return;
    const state = this.itemSkillState?.(contact.characterId || contact.id) || await this.ensureWechatUserProfile?.(contact);
    const time = type === 'sendIncomingPast' ? this.wechatPastMessageTime(action.timeIso) : null;
    const text = String(action.text || '').trim().slice(0, 180);
    if (!text) return;
    this.appendWechatMessage(contact.id, {
      side: 'other', name: state?.profile?.name || contact.name, mark: (state?.profile?.name || contact.name || '').slice(0, 1), text,
      characterId: state?.id || contact.characterId || contact.id, time,
    });
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
