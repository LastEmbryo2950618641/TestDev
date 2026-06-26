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
    return name ? { ...contact, characterId, name, mark: name.slice(0, 1), avatar: contact.avatar, needsNameAi: false } : { ...contact, characterId, avatar: contact.avatar };
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
    this.addRoleCardLoadingCard?.({ id: characterId, name: contact.name || '微信联系人', type: '角色卡' });
    const existingName = existing?.profile?.name || '';
    const contactNameConcrete = profileTool.isConcreteName(contact.name);
    const existingNameConcrete = profileTool.isConcreteName(existingName);
    const needsName = contact.needsNameAi || !contactNameConcrete;
    const hint = this.wechatRelationProfileHint(contact);
    const sections = window.GameModules.promptSections;
    const player = sections.playerProfile(this);
    const relationContext = this.wechatRelationFullContext(contact, hint);
    const targetName = contactNameConcrete ? contact.name : (existingNameConcrete ? existingName : hint.placeholderName);
    const currentWorld = this.currentWorldTag?.() || window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const raw = { id: characterId, name: targetName, role: contact.relation || '微信联系人', detail: relationContext, work: currentWorld, worldTag: currentWorld, isMinor: false, importance: 'support', nameRule: hint.nameRule };
    const context = await window.GameModules.promptTemplates.render('wechat-relation-profile', {
      玩家基础资料区: player.playerBasic,
      玩家现实身份区: player.playerIdentity,
      玩家居住家庭区: player.playerHome,
      玩家人际关系区: player.playerRelations,
      玩家备注区: player.playerNotes,
      微信联系人资料区: sections.wechatContact({ ...contact, context: relationContext }, hint),
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
    this.updateRoleCardLoadingStep?.(characterId, 'state', 'running', '', { done: 0, total: 1 });
    const state = await window.GameModules.rpgState.ensureCharacter({ ...profile, id: characterId }, this);
    this.rpgStates = { ...this.rpgStates, [characterId]: state };
    this.finishRoleCardLoading?.(characterId, state.profile || profile);
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
  wechatRelationFullContext(contact, hint) {
    const p = this.playerProfile || {};
    return [
      `当前联系人：${contact?.name || ''}`,
      `当前关系：${contact?.relation || ''}`,
      `关系条目：${contact?.context || contact?.latest || hint.detail}`,
      `玩家完整人际关系：${p.relationships || '未填写'}`,
      `玩家居住状态：${p.refinedLivingStatus || p.livingStatus || '未填写'}`,
      `玩家补充设定/备注：${p.notes || '无'}`,
    ].join('\n');
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
    const results = await Promise.all(users.map((user) => this.addWechatUser(user, options)));
    return results.filter(Boolean);
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
    const rawText = String(part || '').trim();
    const restText = String(rest || '').trim();
    const text = restText || rawText;
    const rel = String(relation || '').trim().slice(0, 18) || '关系联系人';
    const context = rawText || text;
    const explicitId = context.match(/(?:角色ID|角色id|characterId|id)\s*[：:=]\s*([A-Za-z0-9_-]{2,40})/)?.[1] || '';
    const known = this.roleCardSetup?.usePredefinedPlayerCard ? this.predefinedRelationshipCards().filter((card) => context.includes(card.name)) : [];
    if (known.length) return known.map((card) => ({ id: card.id, characterId: card.id, name: card.name, relation: relation || card.role || '关系联系人', latest: `${relation || card.role || card.name}资料已从玩家人际关系同步。`, source: 'relationships', context, needsNameAi: false }));
    const clean = text.replace(/(?:角色ID|角色id|characterId|id)\s*[：:=]\s*[A-Za-z0-9_-]{2,40}/g, '').trim();
    const named = [...clean.matchAll(/(?:姓名|名字|名叫|叫作|叫做|叫|名为)\s*([\u4e00-\u9fa5A-Za-z0-9_·]{2,24})/g)].map((match) => match[1]);
    const splitParts = clean.split(/[、，,\/|和与及]+/).map((item) => item.trim()).filter(Boolean);
    const directNames = restText ? splitParts : [];
    const explicitNames = (directNames.length ? directNames : splitParts)
      .map((item) => item.replace(/^.*?(?:妹妹|姐姐|哥哥|弟弟|兄弟|姐妹|联系人)?(?:之一|之二|之三|其一|其二|其三)?[：:]?\s*/, '').trim())
      .filter((name) => /^[\u4e00-\u9fa5]{2,4}(?:[·•][\u4e00-\u9fa5]{1,4})?$/.test(name))
      .filter((name) => name !== selfName && !this.isWechatPlaceholderName(name));
    const parts = named.length ? named : (explicitNames.length ? explicitNames : splitParts);
    const names = parts.map((x) => String(x || '').replace(/[（(].*?[）)]/g, '').replace(/[，。；;、,.].*$/, '').trim().slice(0, 24)).filter((x) => x && x !== selfName && x !== rel && !this.isWechatPlaceholderName(x));
    const list = names.length ? names : [rel || `联系人${index + 1}`];
    return list.filter(Boolean).map((name, subIndex) => {
      const needsNameAi = !names.length;
      const id = explicitId && list.length === 1 ? explicitId : `rel-ai-${window.GameModules.rpgState.seed(`${rel}-${name}-${index}-${subIndex}`)}`;
      return { id, characterId: id, name: name.slice(0, 24), relation: rel, latest: `${rel || name}资料已从玩家人际关系同步。`, source: explicitId ? 'relationships' : 'relationships-ai', context, needsNameAi };
    });
  },
  inferWechatUsersFromRelationships(text = '') {
    const source = String(text || '').trim();
    if (!source) return [];
    const selfName = String(this.playerProfile?.name || this.playerName || '').trim();
    return source.split(/[；;\n]+/).map((part) => part.trim()).filter(Boolean).flatMap((part, index) => {
      const pair = part.split(/[：:]/);
      const relation = (pair[0] || '').trim().slice(0, 18);
      const rest = pair.slice(1).join('：').trim();
      return this.relationshipContactsFromPart(part, relation, rest, index, selfName);
    }).filter((user) => user && user.name && user.name !== selfName).slice(0, 20);
  },
  inferWechatUsersFromRelationshipEntries() {
    const entries = this.normalizeRelationshipEntries ? this.normalizeRelationshipEntries(this.playerProfile?.relationshipEntries, this.playerProfile?.relationships) : [];
    const selfName = String(this.playerProfile?.name || this.playerName || '').trim();
    return entries.filter((entry) => entry.relation || entry.name).flatMap((entry, index) => {
      const relation = String(entry.relation || '关系联系人').trim().slice(0, 18);
      const name = String(entry.name || relation).trim().slice(0, 24);
      if (!name || name === selfName) return [];
      const needsNameAi = !entry.name || this.isWechatPlaceholderName(name);
      const context = [`关系名：${relation}`, `姓名：${entry.name || '未填写'}`, `设定：${entry.detail || '无'}`].join('\n');
      const id = `rel-ai-${window.GameModules.rpgState.seed(`${relation}-${name}-${index}`)}`;
      return [{ id, characterId: id, name, relation, latest: `${relation}资料已从玩家人际关系同步。`, source: 'relationships-structured', context, needsNameAi }];
    });
  },

  inferWechatUsersFromProfile() {
    const structured = this.inferWechatUsersFromRelationshipEntries();
    return structured.length ? structured : this.inferWechatUsersFromRelationships(this.playerProfile?.relationships || '');
  },

  selectedPredefinedWechatUsers() {
    return this.predefinedRelationshipCards().map((card) => ({ id: card.id, characterId: card.id, name: card.name, relation: this.roleCardSetup?.relationRoles?.[card.name] || card.role || '关系联系人', latest: `${card.role || card.name}资料已从预定义角色卡同步。`, source: 'predefined-role-card', context: card.detail || card.relationships || '', needsNameAi: false }));
  },
  async syncRelationshipWechatUsers(options = {}) {
    this.syncRelationshipTextFromEntries?.();
    const users = this.inferWechatUsersFromProfile();
    const predefined = this.roleCardSetup?.usePredefinedPlayerCard ? this.selectedPredefinedWechatUsers() : [];
    const merged = [...users, ...predefined].filter((user, index, list) => list.findIndex((item) => item.id === user.id) === index);
    const replacements = new Map(users.filter((user) => user.context && !user.needsNameAi).map((user) => [String(user.relation || ''), user]));
    this.wechatUsers = (this.wechatUsers || []).map((item) => {
      if (!this.isWechatPlaceholderName(item?.name)) return item;
      const replacement = replacements.get(String(item.relation || ''));
      return replacement ? { ...item, ...replacement, id: replacement.id, characterId: replacement.characterId || replacement.id, needsNameAi: false } : item;
    });
    return this.addWechatUsers(merged, options);
  },
};
