window.GameModules = window.GameModules || {};

window.GameModules.realWorldAgentWechat = {
  wechat(store, method, params = {}) {
    if (method === 'listWechatSkills') return [
      'wechat.query.listContacts：读取微信联系人清单。',
      'wechat.query.getThread：读取某联系人最近微信消息。',
      'wechat.message.incoming.sendIncomingNow：已是好友时主动发微信；必须带 intentChain（cause/process/result/whyPlayer）；系统会挂本轮记录ID。',
      'wechat.message.incoming.sendIncomingPast：已是好友时写过去未读微信；同样必须带完整 intentChain。',
      'wechat.friend.request.requestWechatFriend：尚非好友时发起申请；只产生 pending；必须带完整 intentChain；禁止直接加为好友。',
    ].join('\n');
    const contacts = (store.wechatContacts?.() || []).filter((c) => !c.group);
    if (method === 'listContacts') return this.contactsText(contacts);
    return this.threadText(store, contacts, params);
  },

  contactsText(contacts = []) {
    return contacts.map((c) => `- ${c.name}｜id:${c.id}｜角色id:${c.characterId || c.id}｜关系:${c.relation || c.subtitle || ''}｜未读:${c.unread || 0}｜最新:${c.latest || ''}`).join('\n') || '暂无微信联系人。';
  },

  threadText(store, contacts = [], params = {}) {
    const id = String(params.contactId || params.characterId || params.id || '').trim();
    const contact = contacts.find((c) => c.id === id || c.characterId === id || c.name === id) || contacts[0];
    const key = store.wechatMessageKey?.(contact) || contact?.id || id;
    const count = Math.max(1, Math.min(12, Number(params.count) || 8));
    const rows = (store.wechatMessagesByContact?.[key] || []).slice(-count);
    return rows.map((m) => `${m.atDisplay || m.at || m.time || '时间未知'}｜${m.side === 'self' ? '玩家' : (m.name || contact?.name || '联系人')}：${m.text || ''}`).join('\n') || `联系人${contact?.name || id || ''}暂无微信历史。`;
  },
};
