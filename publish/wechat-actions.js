window.GameModules = window.GameModules || {}; window.GameModules.wechatActions = {
  defaultWechatGroup() {
    return { id: 'group-main', name: '操控者交流群', mark: '群', subtitle: '聊天群', latest: '系统：新手机已激活。', unread: 8, group: true };
  },
  normalizeWechatContact(raw = {}) {
    const name = String(raw.name || '').trim().slice(0, 24);
    if (!name) return null;
    const relation = String(raw.relation || raw.subtitle || '联系人').trim().slice(0, 30);
    const id = String(raw.id || `wx-${name}-${relation}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || `wx-${window.GameModules.rpgState.seed(`${name}-${relation}`)}`;
    const needsNameAi = raw.needsNameAi ?? (this.isWechatPlaceholderName(name) && !raw.id);
    return { id, characterId: id, name, relation, subtitle: relation, mark: String(raw.mark || name.slice(0, 1)).slice(0, 2), latest: String(raw.latest || `${relation}资料已同步。`).slice(0, 80), unread: Number(raw.unread) || 0, group: false, source: raw.source || 'manual', context: raw.context || '', needsNameAi };
  },
  isWechatPlaceholderName(name = '') {
    const text = String(name || '').trim();
    return !text || /待命名|待AI补全|等待AI补全|等待ai补全|姓名待AI补全/i.test(text)
      || /^(妹妹|姐姐|哥哥|弟弟|父亲|母亲|爸爸|妈妈|女友|男友|妻子|丈夫|联系人)$/.test(text)
      || /^(双胞胎|三胞胎|多胞胎)?(妹妹|姐姐|哥哥|弟弟|兄弟|姐妹|联系人)(之一|之二|之三|其一|其二|其三)$/.test(text);
  },
  concreteWechatProfileName(profile, contact = {}) {
    const name = String(profile?.name || '').trim();
    if (!name || this.isWechatPlaceholderName(name) || name === contact.relation) return '';
    return name.slice(0, 24);
  },
  wechatCharacterId(contact) {
    if (!contact || contact.group) return '';
    return String(contact.id || '').trim();
  },
  displayWechatContact(contact) {
    if (!contact || contact.group) return contact;
    const characterId = this.wechatCharacterId(contact);
    const state = this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId);
    const name = this.concreteWechatProfileName(state?.profile, contact);
    return name ? { ...contact, characterId, name, mark: name.slice(0, 1), needsNameAi: false } : { ...contact, characterId };
  },
  syncWechatContactId(id) {
    if (!id) return false;
    let changed = false;
    this.wechatUsers = (this.wechatUsers || []).map((item) => {
      if (item.id !== id || item.characterId === id) return item;
      changed = true;
      return { ...item, characterId: id };
    });
    return changed;
  },
  syncWechatContactProfileName(id, profile) {
    const old = (this.wechatUsers || []).find((item) => item.id === id);
    const name = this.concreteWechatProfileName(profile, old);
    if (!old || !name || old.name === name) return false;
    this.renameWechatContact(id, name);
    return true;
  },
  syncWechatContactsFromRpgStates() {
    let changed = false;
    this.wechatUsers = (this.wechatUsers || []).map((item) => {
      const characterId = this.wechatCharacterId(item);
      const state = this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId);
      const name = this.concreteWechatProfileName(state?.profile, item);
      let next = item.characterId === characterId ? item : { ...item, characterId };
      if (name && next.name !== name) next = { ...next, name, mark: name.slice(0, 1), subtitle: next.relation || next.subtitle, needsNameAi: false };
      if (next !== item) changed = true;
      return next;
    });
    return changed;
  },
  async ensureWechatUserProfile(contact) {
    if (!contact || contact.group) return null;
    this.wechatProfileInflight = this.wechatProfileInflight || {};
    if (this.wechatProfileInflight[contact.id]) return this.wechatProfileInflight[contact.id];
    return this.wechatProfileInflight[contact.id] = this.ensureWechatUserProfileRun(contact).finally(() => { delete this.wechatProfileInflight[contact.id]; });
  },
  async ensureWechatUserProfileRun(contact) {
    const characterId = this.wechatCharacterId(contact);
    const existing = this.rpgStates?.[characterId] || window.GameModules.sqliteSave.getCharacterState(characterId);
    const profileTool = window.GameModules.characterProfile;
    if (existing?.profile && profileTool.isReusableRoleCard(existing.profile)) {
      this.rpgStates = { ...(this.rpgStates || {}), [characterId]: existing };
      this.syncWechatContactId(characterId);
      return existing;
    }
    const existingName = existing?.profile?.name || '';
    const needsName = contact.needsNameAi || this.isWechatPlaceholderName(contact.name) || !profileTool.isConcreteName(existingName);
    const hint = this.wechatRelationProfileHint(contact);
    const sections = window.GameModules.promptSections;
    const player = sections.playerProfile(this);
    const raw = { id: characterId, name: needsName ? hint.placeholderName : contact.name, role: contact.relation || '微信联系人', detail: contact.context || contact.latest || hint.detail, work: '现实世界', isMinor: false, importance: 'support', nameRule: hint.nameRule };
    const context = await window.GameModules.promptTemplates.render('wechat-relation-profile', {
      玩家基础资料区: player.playerBasic,
      玩家现实身份区: player.playerIdentity,
      玩家居住家庭区: player.playerHome,
      玩家人际关系区: player.playerRelations,
      玩家备注区: player.playerNotes,
      微信联系人资料区: sections.wechatContact(contact, hint),
    });
    let profile;
    try {
      profile = await window.GameModules.characterProfile.ensure(raw, this, context);
    } catch (err) {
      console.warn('[微信] 联系人姓名补全失败，保留旧资料:', err.code, err.message, err.stack);
      this.wechatError = '联系人姓名补全暂时失败，请稍后重试。';
      return existing || null;
    }
    if (!window.GameModules.characterProfile.isConcreteName(profile.name)) {
      this.wechatError = '联系人姓名仍未补全，请稍后重试。';
      return existing || null;
    }
    const state = await window.GameModules.rpgState.ensureCharacter({ ...profile, id: characterId }, this);
    this.rpgStates = { ...this.rpgStates, [characterId]: state };
    const idChanged = this.syncWechatContactId(characterId);
    const renamed = this.syncWechatContactProfileName(characterId, state.profile || profile);
    if (idChanged || renamed) await this.save?.();
    return state;
  },
  wechatRelationProfileHint(contact) {
    const relation = String(contact?.relation || contact?.name || '联系人');
    const nameRule = `必须由AI根据世界观、地区文化、家庭制度、玩家姓名、玩家性别与“${relation}”这段社会关系推理正式姓名和性别；不要硬套同姓规则，母亲/配偶/继亲/养亲等可能不同姓；不要直接用关系称谓当姓名。`;
    return { nameRule, placeholderName: `${relation}待命名`, detail: `玩家的${relation}，需要按世界观、文化习俗和社会关系补全姓名、性别与资料。` };
  },
  renameWechatContact(id, name) {
    this.wechatUsers = (this.wechatUsers || []).map((item) => item.id === id ? { ...item, name, mark: String(name).slice(0, 1), subtitle: item.relation || item.subtitle, needsNameAi: false } : item);
  },
  async addWechatUser(user = {}, options = {}) {
    const contact = this.normalizeWechatContact(user);
    if (!contact) return null;
    const list = Array.isArray(this.wechatUsers) ? [...this.wechatUsers] : [];
    const normalized = { ...contact, characterId: contact.id };
    const index = list.findIndex((item) => item.id === normalized.id);
    if (index >= 0) list[index] = { ...list[index], ...normalized };
    else list.push(normalized);
    this.wechatUsers = list;
    const stored = this.wechatUsers[index >= 0 ? index : this.wechatUsers.length - 1];
    if (options.generateProfile !== false) {
      try { await this.ensureWechatUserProfile(stored); }
      catch (err) { console.warn('[微信] 联系人资料生成失败:', err.code, err.message, err.stack); }
    }
    if (options.save !== false) await this.save?.();
    return normalized;
  },
  async addWechatUsers(users = [], options = {}) {
    if (!Array.isArray(users)) return [];
    const added = [];
    for (const user of users) {
      const contact = await this.addWechatUser(user, options);
      if (contact) added.push(contact);
    }
    return added;
  },
  async submitWechatAddUser() {
    const contact = await this.addWechatUser({ name: this.wechatAddName, relation: this.wechatAddRelation || '微信联系人', source: 'manual' }, { generateProfile: true });
    if (!contact) return null;
    this.wechatAddName = '';
    this.wechatAddRelation = '';
    this.wechatTab = 'contacts';
    return contact;
  },
  predefinedRelationshipCards() {
    const selected = this.roleCardSetup?.selectedRelationNames || [];
    const cards = this.roleCardSetup?.cards || window.GameModules.predefinedRoleCards?.cache || [];
    return cards.filter((card) => card?.name && card?.id && (!selected.length || selected.includes(card.name)));
  },
  relationshipContactsFromPart(part, relation, rest, index, selfName) {
    const text = rest || part;
    const explicitId = rest.match(/(?:角色ID|角色id|characterId|id)\s*[：:=]\s*([A-Za-z0-9_-]{2,40})/)?.[1] || '';
    const known = this.roleCardSetup?.usePredefinedPlayerCard ? this.predefinedRelationshipCards().filter((card) => text.includes(card.name)) : [];
    if (known.length) return known.map((card) => ({ id: card.id, characterId: card.id, name: card.name, relation: relation || card.role || '关系联系人', latest: `${relation || card.role || card.name}资料已从玩家人际关系同步。`, source: 'relationships', context: text, needsNameAi: false }));
    const keyRelation = relation || (text.match(/(青梅竹马|校花|妹妹|姐姐|哥哥|弟弟|父母|父亲|母亲|爸爸|妈妈|女友|男友|妻子|丈夫|同桌|同学|老师|邻居|同事)/)?.[1] || '');
    const names = (rest.match(/[\u4e00-\u9fa5A-Za-z_·]{2,12}/g) || []).map((x) => x.replace(/[，。；;、,.].*$/, '').trim()).filter((x) => x && x !== selfName && !/(已故|同住|关系|父母|妹妹|姐姐|哥哥|弟弟|青梅竹马|校花|同桌|同学|老师|邻居|同事)/.test(x));
    const placeholders = keyRelation === '父母' ? ['父亲', '母亲'] : [keyRelation || `联系人${index + 1}`];
    const list = names.length ? names : placeholders;
    return list.filter(Boolean).map((name, subIndex) => {
      const rel = names.length ? (keyRelation || relation || '关系联系人') : name;
      const id = explicitId && list.length === 1 ? explicitId : `rel-ai-${window.GameModules.rpgState.seed(`${rel}-${name}-${index}-${subIndex}`)}`;
      return { id, characterId: id, name: name.slice(0, 24), relation: rel, latest: `${rel || name}资料已从玩家人际关系同步。`, source: explicitId ? 'relationships' : 'relationships-ai', context: text, needsNameAi: !names.length };
    });
  },
  inferWechatUsersFromRelationships(text = '') {
    const source = String(text || '').trim();
    if (!source) return [];
    const selfName = String(this.playerProfile?.name || this.playerName || '').trim();
    return source.split(/[；;\n]+/).flatMap((part, index) => {
      const pair = part.split(/[：:]/);
      const relation = (pair[0] || '').trim().slice(0, 18);
      const rest = pair.slice(1).join('：').trim();
      return this.relationshipContactsFromPart(part, relation, rest, index, selfName);
    }).filter((user) => user && user.name && user.name !== selfName).slice(0, 20);
  },
  selectedPredefinedWechatUsers() {
    return this.predefinedRelationshipCards().map((card) => ({ id: card.id, characterId: card.id, name: card.name, relation: this.roleCardSetup?.relationRoles?.[card.name] || card.role || '关系联系人', latest: `${card.role || card.name}资料已从预定义角色卡同步。`, source: 'predefined-role-card', context: card.detail || card.relationships || '', needsNameAi: false }));
  },
  async syncRelationshipWechatUsers(options = {}) {
    const users = this.inferWechatUsersFromRelationships(this.playerProfile?.relationships || '');
    const predefined = this.roleCardSetup?.usePredefinedPlayerCard ? this.selectedPredefinedWechatUsers() : [];
    const merged = [...users, ...predefined].filter((user, index, list) => list.findIndex((item) => item.id === user.id) === index);
    return this.addWechatUsers(merged, options);
  },
};
