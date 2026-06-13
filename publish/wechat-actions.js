window.GameModules = window.GameModules || {};

window.GameModules.wechatActions = {
  defaultWechatGroup() {
    return { id: 'group-main', name: '操控者交流群', mark: '群', subtitle: '聊天群', latest: '系统：新手机已激活。', unread: 8, group: true };
  },

  normalizeWechatContact(raw = {}) {
    const name = String(raw.name || '').trim().slice(0, 24);
    if (!name) return null;
    const relation = String(raw.relation || raw.subtitle || '联系人').trim().slice(0, 30);
    const id = String(raw.id || `wx-${name}-${relation}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || `wx-${window.GameModules.rpgState.seed(`${name}-${relation}`)}`;
    return { id, name, relation, subtitle: relation, mark: String(raw.mark || name.slice(0, 1)).slice(0, 2), latest: String(raw.latest || `${relation}资料已同步。`).slice(0, 80), unread: Number(raw.unread) || 0, group: false, source: raw.source || 'manual', context: raw.context || '' };
  },

  async ensureWechatUserProfile(contact) {
    if (!contact || contact.group) return null;
    const raw = { id: contact.id, name: contact.name, role: contact.relation || '微信联系人', detail: contact.context || contact.latest || '与玩家互有微信的现实联系人。', work: '现实世界', isMinor: false, importance: 'support' };
    const context = `玩家姓名：${this.playerProfile?.name || this.playerName || '未知'}；玩家关系：${this.playerProfile?.relationships || '未填写'}；微信关系：${contact.relation || '联系人'}；补充：${contact.context || contact.latest || ''}`;
    const profile = await window.GameModules.characterProfile.ensure(raw, this, context);
    const state = await window.GameModules.rpgState.ensureCharacter(profile, this);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    return state;
  },

  async addWechatUser(user = {}) {
    const contact = this.normalizeWechatContact(user);
    if (!contact) return null;
    const list = Array.isArray(this.wechatUsers) ? [...this.wechatUsers] : [];
    const index = list.findIndex((item) => item.id === contact.id || item.name === contact.name);
    if (index >= 0) list[index] = { ...list[index], ...contact };
    else list.push(contact);
    this.wechatUsers = list;
    try { await this.ensureWechatUserProfile(contact); } catch (err) { console.warn('[微信] 联系人资料生成失败:', err.code, err.message, err.stack); }
    await this.save?.();
    return contact;
  },

  async addWechatUsers(users = []) {
    if (!Array.isArray(users)) return [];
    const added = [];
    for (const user of users) {
      const contact = await this.addWechatUser(user);
      if (contact) added.push(contact);
    }
    return added;
  },

  async submitWechatAddUser() {
    const contact = await this.addWechatUser({ name: this.wechatAddName, relation: this.wechatAddRelation || '微信联系人', source: 'manual' });
    if (!contact) return null;
    this.wechatAddName = '';
    this.wechatAddRelation = '';
    this.wechatTab = 'contacts';
    return contact;
  },

  inferWechatUsersFromRelationships(text = '') {
    const source = String(text || '').trim();
    if (!source) return [];
    const selfName = String(this.playerProfile?.name || this.playerName || '').trim();
    return source.split(/[；;\n]+/).map((part, index) => {
      const pair = part.split(/[：:]/);
      const relation = (pair[0] || '').trim().slice(0, 18);
      const rest = pair.slice(1).join('：').trim();
      const named = rest.match(/(?:姓名|名字|名叫|叫作|叫做|叫|名为)\s*([\u4e00-\u9fa5A-Za-z0-9_·]{2,12})/);
      let name = String(named?.[1] || relation || `联系人${index + 1}`).replace(/[，。；;、,.].*$/, '').trim().slice(0, 24);
      if (selfName && name.includes(selfName)) name = relation || `联系人${index + 1}`;
      if (!relation && !name) return null;
      return { id: `rel-${index}-${name}`, name, relation: relation || '关系联系人', latest: `${relation || name}资料已从玩家人际关系同步。`, source: 'relationships', context: rest || part };
    }).filter((user) => user && user.name && user.name !== selfName).slice(0, 20);
  },

  async syncRelationshipWechatUsers() {
    const users = this.inferWechatUsersFromRelationships(this.playerProfile?.relationships || '');
    return this.addWechatUsers(users);
  },
};
