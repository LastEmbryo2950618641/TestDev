
;// ---- real-world-agent-wechat.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorldAgentWechat = {
  wechat(store, method, params = {}) {
    if (method === 'listWechatSkills') return [
      'wechat.query.listContacts：读取微信联系人清单。',
      'wechat.query.getThread：读取某联系人最近微信消息。',
      'wechat.message.incoming.sendIncomingNow：在当前手机时间写入角色主动发给玩家的微信消息。',
      'wechat.message.incoming.sendIncomingPast：在指定过去时间写入角色主动发给玩家的未读微信消息。',
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


;// ---- prompts/wechat/wechat-image-prompt-collect.js ----
// GENERATED FROM publish/prompts/wechat/wechat-image-prompt-collect.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["wechat-image-prompt-collect"] = "# 微信图片提示词收集\n\n你是微信自拍图片编辑标签收集器。请根据当前联系人资料、全部短期记忆、全部长期记忆、当前穿戴和本次自拍意图，整理用于 AI 图片编辑的二次元英文标签。\n\n## 联系人资料\n\n{{联系人资料区}}\n\n## 目标状态快照\n\n{{目标状态快照}}\n\n## 全部短期记忆\n\n{{短期记忆区}}\n\n## 全部长期记忆\n\n{{长期记忆区}}\n\n## 当前穿戴\n\n{{当前穿戴区}}\n\n## 微信历史\n\n{{微信历史}}\n\n## 本次自拍意图\n\n{{自拍意图}}\n\n## 输出规则\n\n1. 只输出英文标签，标签之间使用英文逗号 `,` 分隔。\n2. 不要输出 Markdown，不要代码块，不要解释，不要中文句子。\n3. 标签应服务于“以角色真实照片为基础进行图片编辑”，优先描述当前穿戴、表情、姿势、氛围、场景和光影。\n4. 不要改写人物身份和基础脸型；保留原照片角色一致性。\n5. 一次只强调 3-5 个关键变化，其余用辅助标签补充。\n6. 总长度控制在 1000 字符以内。\n\n## 输出\n\nenglish tag1, english tag2, english tag3";


;// ---- prompts/picture_generate/wechat-album-photo.js ----
// GENERATED FROM publish/prompts/picture_generate/wechat-album-photo.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.promptTemplates = window.GameModules.promptTemplates || {};
window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
window.GameModules.promptTemplates.inline["wechat-album-photo"] = "单人，全身，正面站姿，清晰面部，完整身体比例，干净背景，无文字，无水印，高质量二次元风格，{{角色身份信息标签}}，{{状态部位描述标签}}，natural, original body, no clothes\n";


;// ---- wechat-cleanup.js ----
window.GameModules = window.GameModules || {};

window.GameModules.wechatCleanup = {
  version: 'clear-old-wechat-records-v2',

  run(store) {
    const save = window.GameModules.sqliteSave;
    if (!save?.db || save.getMetaJson?.(this.version)) return false;
    let changed = this.cleanWorldline(store);
    changed = this.cleanMemories(save) || changed;
    save.saveMetaJson(this.version, { cleanedAt: new Date().toISOString(), changed }).catch((err) => console.warn('[微信清理] 标记迁移失败:', err.message, err.stack));
    if (changed) window.GameModules.storage.put(window.GameModules.storage.snapshot(store)).catch((err) => console.warn('[微信清理] 保存清理结果失败:', err.message, err.stack));
    return changed;
  },

  isOldWechatText(text = '') {
    return /来源：微信|玩家发送：|联系人回复：|联系人语气：|微信时间：/.test(String(text || ''));
  },

  cleanWorldline(store) {
    const state = store.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    const events = state.events || [];
    const nextEvents = events.filter((event) => !(String(event.eventId || '').startsWith('wx_') || this.isOldWechatText(event.detail)));
    const changed = nextEvents.length !== events.length;
    if (changed) store.realWorldlineState = { ...state, events: nextEvents };
    return changed;
  },

  cleanMemories(save) {
    let changed = false;
    const stmt = save.db.prepare('SELECT character_id,memory_json FROM character_memory');
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    rows.forEach((row) => {
      const memory = JSON.parse(row.memory_json);
      const next = this.cleanMemoryObject(memory);
      if (!next.changed) return;
      save.db.run('INSERT OR REPLACE INTO character_memory(character_id,memory_json,updated_at) VALUES (?,?,?)', [row.character_id, JSON.stringify(next.memory), new Date().toISOString()]);
      changed = true;
    });
    const archive = save.db.prepare('SELECT id,text FROM memory_archive');
    const archiveIds = [];
    while (archive.step()) {
      const row = archive.getAsObject();
      if (this.isOldWechatText(row.text)) archiveIds.push(row.id);
    }
    archive.free();
    archiveIds.forEach((id) => save.db.run('DELETE FROM memory_archive WHERE id=?', [id]));
    return archiveIds.length > 0 || changed;
  },

  cleanMemoryObject(memory) {
    const sections = ['recent', 'summaryBuffer', 'summarized', 'forgotten'];
    let changed = false;
    const shortTerm = { ...(memory.shortTerm || {}) };
    sections.forEach((key) => {
      const list = shortTerm[key] || [];
      const next = list.filter((item) => !this.isOldWechatText(item.text) && !this.isOldWechatText(item.summary));
      if (next.length !== list.length) changed = true;
      shortTerm[key] = next;
    });
    const longTerm = { ...(memory.longTerm || {}) };
    ['vivid', 'permanent'].forEach((key) => {
      const list = longTerm[key] || [];
      const next = list.filter((item) => !this.isOldWechatText(item.text) && !this.isOldWechatText(item.summary));
      if (next.length !== list.length) changed = true;
      longTerm[key] = next;
    });
    return { changed, memory: { ...memory, shortTerm, longTerm, updatedAt: changed ? new Date().toISOString() : memory.updatedAt } };
  },
};


;// ---- wechat-actions.js ----
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
    const context = await window.GameModules.renderPrompt('wechat-relation-profile', {
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
    if (typeof window.GameModules.playerSetupActions?.inferActivationRoleCardUsers === 'function') {
      return window.GameModules.playerSetupActions.inferActivationRoleCardUsers.call(this);
    }
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


;// ---- wechat-view-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.wechatViewActions = {
  wechatContacts() {
    const group = this.defaultWechatGroup?.() || { id: 'group-main', name: '操控者交流群', mark: '群', group: true };
    const users = (this.wechatUsers || []).map((contact) => this.displayWechatContact?.(contact) || contact);
    return [group, ...users];
  },

  wechatThreads() {
    return this.wechatContacts().map((contact) => {
      const key = this.wechatMessageKey?.(contact) || contact.id;
      const latest = this.wechatMessagesByContact?.[key]?.slice(-1)?.[0]?.text || contact.latest || '';
      return { ...contact, latest: String(latest).slice(0, 80) };
    });
  },

  wechatSelected() {
    const contacts = this.wechatContacts();
    const selectedId = this.wechatSelectedContact || 'group-main';
    return contacts.find((contact) => contact.id === selectedId) || contacts[0] || { id: 'group-main', name: '微信', mark: '微', group: true };
  },

  setWechatTab(tab) {
    this.wechatTab = tab || 'chats';
    this.wechatView = 'home';
  },
};


;// ---- wechat-memory-context-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.wechatMemoryContextActions = {
  ensureWechatHistoryTable() {
    const db = window.GameModules.sqliteSave;
    if (!db?.db) return false;
    db.db.run('CREATE TABLE IF NOT EXISTS wechat_history(id TEXT PRIMARY KEY, contact_id TEXT NOT NULL, message_json TEXT NOT NULL, created_at TEXT NOT NULL)');
    return true;
  },

  async saveWechatHistoryRow(contactId, message) {
    const db = window.GameModules.sqliteSave;
    if (!contactId || !message || !this.ensureWechatHistoryTable()) return;
    const createdAt = this.wechatHistoryCreatedAt(message);
    const id = `${contactId}_${createdAt}_${String(message.side || '').slice(0, 1)}_${window.GameModules.rpgState?.seed?.(message.text || message.imageRecord || createdAt) || Date.now()}`;
    db.db.run('INSERT OR REPLACE INTO wechat_history(id,contact_id,message_json,created_at) VALUES (?,?,?,?)', [id, contactId, JSON.stringify(message), createdAt]);
    await db.persist();
  },

  wechatHistoryCreatedAt(message = {}) {
    if (typeof message.time === 'string' && message.time.trim()) return message.time;
    const t = message.time || {};
    if (Number(t.year) && Number(t.month) && Number(t.day)) {
      const pad = (n) => String(Number(n) || 0).padStart(2, '0');
      return `${Number(t.year)}-${pad(t.month)}-${pad(t.day)}T${pad(t.hour)}:${pad(t.minute)}:${pad(t.second)}`;
    }
    return String(message.atDisplay || message.at || new Date().toISOString());
  },

  listWechatHistoryRows(contactId, limit = 12) {
    const db = window.GameModules.sqliteSave;
    if (!contactId || !this.ensureWechatHistoryTable()) return [];
    const rows = [];
    const stmt = db.db.prepare('SELECT message_json FROM wechat_history WHERE contact_id=? ORDER BY created_at DESC LIMIT ?');
    stmt.bind([contactId, limit]);
    while (stmt.step()) {
      try { rows.push(JSON.parse(stmt.getAsObject().message_json)); }
      catch (_) { /* 忽略坏行 */ }
    }
    stmt.free();
    return rows.reverse();
  },

  wechatHistoryQueryText(contactId, limit = 12) {
    const list = this.listWechatHistoryRows(contactId, limit);
    const fallback = this.wechatMessagesByContact?.[contactId] || [];
    const source = list.length ? list : fallback.slice(-limit);
    if (!source.length) return '暂无历史消息。';
    return source.map((msg) => msg.imageRecord || `${msg.side === 'self' ? '玩家' : '联系人'}：${msg.text}`).join('\n');
  },

  wechatHistoryText(id) { return this.wechatHistoryQueryText(id, 12); },

  wechatMemoryContext(characterId, playerText = '') {
    const full = this.getCharacterMemory?.(characterId) || '暂无人物记忆。';
    const query = this.memoryQueryContext?.(characterId, playerText) || '暂无关键词记忆。';
    return [`## 联系人短期与长期记忆\n${full}`, `## 本次消息相关记忆\n${query}`].join('\n\n').slice(0, 4200);
  },

  validateWechatHistoryDecision(raw = {}) {
    return { needHistory: !!raw.needHistory, limit: Math.max(3, Math.min(20, Math.round(Number(raw.limit) || 8))), reason: String(raw.reason || '本次微信回复上下文判断').slice(0, 120) };
  },

  async wechatHistoryContextForReply(contactId, playerText = '', memoryContext = '') {
    const hint = this.wechatHistoryQueryHint(contactId);
    if (!window.dzmm?.completions) return hint;
    const prompt = await window.GameModules.renderPrompt('wechat-history-decision', {
      contactId,
      playerText,
      memoryContext: String(memoryContext || '').slice(0, 2600),
    });
    try {
      const decision = await window.GameModules.jsonUtils.generateJsonWithRetry({
        source: 'wechat-history-decision', promptId: 'wechat-history-decision', model: this.modelId || this.settingsState?.textModelId, timeoutMs: 30000, prompt, format: prompt, max: 2,
        parse: (text) => window.GameModules.jsonUtils.parseLoose(text),
        validate: (raw) => this.validateWechatHistoryDecision(raw),
      });
      if (!decision.needHistory) return [hint, `AI判断：本次不需要读取微信原文。原因：${decision.reason}`].join('\n');
      return [hint, `## 本次按需查询微信历史\n查询原因：${decision.reason}\n${this.wechatHistoryQueryText(contactId, decision.limit)}`].join('\n\n').slice(0, 3200);
    } catch (err) {
      console.warn('[微信] 历史按需判断失败，继续使用记忆上下文:', err.code, err.message, err.stack);
      return hint;
    }
  },

  wechatHistoryQueryHint(characterId) {
    return [
      '微信历史已存入固定表 wechat_history，默认不全文载入。',
      `如本次消息需要核对微信原文、上一条话术、具体聊天措辞或图片消息，可查询当前联系人 contact_id=${characterId} 的微信历史。`,
      '当前未查询时，不要把缺失的微信原文当作已知事实；优先依据短期记忆、长期记忆和本次相关记忆回复。',
    ].join('\n');
  },
};


;// ---- wechat-chat-actions.js ----
window.GameModules = window.GameModules || {}; window.GameModules.wechatChatActions = {
  selectWechatContact(id) {
    this.wechatSelectedContact = id || this.wechatThreads()[0]?.id || 'player-self';
    const selected = (this.wechatUsers || []).find((item) => item.id === this.wechatSelectedContact);
    const profile = this.rpgStates?.[this.wechatSelectedContact]?.profile;
    if (selected && !window.GameModules.characterProfile.isConcreteName(profile?.name)) {
      this.ensureWechatUserProfile?.(selected).then(() => this.save?.()).catch((err) => console.warn('[微信] 选中联系人资料补全失败:', err.code, err.message, err.stack));
    }
    const renamed = this.syncWechatContactsFromRpgStates?.();
    this.wechatUsers = (this.wechatUsers || []).map((item) => item.id === this.wechatSelectedContact ? { ...item, unread: 0 } : item);
    this.wechatView = 'chat';
    this.debugWechatMemory?.();
    if (renamed) this.save?.();
  },

  wechatMessageKey(contact) {
    if (!contact || contact.group) return contact?.id || 'group-main';
    return contact.id;
  },

  wechatMessages() {
    const target = this.wechatSelected();
    const key = this.wechatMessageKey(target);
    const stored = this.wechatMessagesByContact?.[key] || [];
    if (stored.length) return stored;
    if (target?.group) return [{ side: 'other', name: '系统', mark: '系', text: '新手机已激活，微信数据同步完成。' }];
    return [{ side: 'other', name: target?.name, mark: target?.mark, text: target?.latest || '资料已同步。' }];
  },

  async sendWechatMessage() {
    const text = String(this.wechatInput || '').trim();
    const target = this.wechatSelected();
    if (!text || this.wechatSending || !target) return;
    this.wechatError = '';
    this.wechatInput = '';
    this.wechatMentionPanelOpen = false;
    this.appendWechatMessage(this.wechatMessageKey(target), { side: 'self', name: this.playerDisplayCharacter?.().name || this.playerName || '我', mark: '我', text });
    if (target.group) await this.recordWechatWorldline(target, text, '');
    await this.save?.();
    if (target.group) return;
    await this.replyWechatContact(target, text);
  },

  appendWechatMessage(id, msg) {
    const key = id || 'group-main';
    const time = msg.time || this.wechatMessageTime();
    const saved = { ...msg, at: time.label, atDisplay: time.display, time: time.value };
    const list = [...(this.wechatMessagesByContact?.[key] || []), saved].slice(-40);
    this.wechatMessagesByContact = { ...(this.wechatMessagesByContact || {}), [key]: list };
    this.saveWechatHistoryRow?.(key, saved)?.catch?.((err) => console.warn('[微信] 固定历史写入失败:', err?.code || '', err?.message || String(err), err?.stack || ''));
    if (msg.text) this.updateWechatLatest(key, msg.text, msg.side === 'other');
  },

  wechatMessageTime() {
    const d = this.phoneDate?.() || new Date();
    return { label: `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim(), display: this.wechatTimeDisplay(d), value: this.wechatTimeValue(d) };
  },

  wechatMemoryTime() {
    const d = this.phoneDate?.() || new Date();
    return { label: `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim(), value: this.wechatTimeValue(d) };
  },

  wechatDialogueTimeLabel(label = '') {
    return String(label || '时间未知').replace(/日周/g, '日 周');
  },

  formatWechatDialogueLog(playerName, contactName, label, playerText, replyText = '') {
    const time = this.wechatDialogueTimeLabel(label);
    return [
      '以下来自微信对话。',
      `${playerName}（${time}）：“${playerText}”`,
      replyText ? `${contactName}（${time}）：“${replyText}”` : '',
    ].filter(Boolean).join('');
  },

  wechatTimeValue(d) {
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
  },

  wechatTimeDisplay(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  updateWechatLatest(id, latest, incoming = false) {
    this.wechatUsers = (this.wechatUsers || []).map((item) => item.id === id ? { ...item, latest: String(latest).slice(0, 80), unread: incoming && this.wechatSelectedContact !== id ? (Number(item.unread) || 0) + 1 : item.unread } : item);
  },

  async replyWechatContact(contact, playerText) {
    this.wechatSending = true;
    const reqId = (this.wechatReplyRequestId || 0) + 1;
    this.wechatReplyRequestId = reqId;
    try {
      const result = await this.generateWechatReply(contact, playerText);
      if (reqId !== this.wechatReplyRequestId) return;
      const characterId = contact.id;
      const state = this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId) || await this.ensureWechatUserProfile?.(contact);
      result.characterCardChanges = await window.GameModules.characterCardLexicon?.applyToState?.(state, result.lexiconUpdates || []) || [];
      await this.applyMetricUpdatesToState?.(state, result.metricUpdates);
      await this.applyInventoryUpdatesToState?.(state, result.lexiconUpdates || []);
      this.advancePhoneTime?.(result.elapsedSeconds || 60);
      this.appendWechatMessage(characterId, { side: 'other', name: state?.profile?.name || contact.name, mark: (state?.profile?.name || contact.name || '').slice(0, 1), text: result.reply, characterId, metricUpdates: result.metricUpdates, lexiconUpdates: result.lexiconUpdates, characterCardChanges: result.characterCardChanges, cardChangesOpen: false, changeReasonsOpen: false });
      if (result.imageIntent?.offer) await this.appendWechatPendingImageMessage(characterId, state, contact, { ...result.imageIntent, impression: result.impression });
      await window.GameModules.characterMemory?.recordWechatExchange?.(this, { ...contact, id: characterId, characterId }, playerText, result.reply, result);
      window.GameModules.factionArchive?.recordWechat?.(this, { ...contact, id: characterId, characterId }, playerText, result.reply, result);
      await this.recordWechatWorldline({ ...contact, id: characterId, characterId }, playerText, result.reply, result);
      this.debugWechatMemory?.({ ...contact, id: characterId, characterId });
      await this.save?.();
    } catch (err) {
      if (reqId !== this.wechatReplyRequestId) return;
      console.error('[微信] 联系人回复生成失败:', err.code, err.message, err.stack);
      this.wechatError = err.message || '联系人暂时没有回复';
      const fallback = '我这边刚刚有点卡，等下再说。';
      const characterId = contact.id;
      const state = this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId);
      this.advancePhoneTime?.(60);
      this.appendWechatMessage(characterId, { side: 'other', name: state?.profile?.name || contact.name, mark: (state?.profile?.name || contact.name || contact.mark || '').slice(0, 1), text: fallback, characterId });
      await window.GameModules.characterMemory?.recordWechatExchange?.(this, { ...contact, id: characterId, characterId }, playerText, fallback, { mood: '通讯异常' });
      window.GameModules.factionArchive?.recordWechat?.(this, { ...contact, id: characterId, characterId }, playerText, fallback, { mood: '通讯异常' });
      await this.recordWechatWorldline({ ...contact, id: characterId, characterId }, playerText, fallback, { mood: '通讯异常' });
      await this.save?.();
    } finally {
      if (reqId === this.wechatReplyRequestId) this.wechatSending = false;
    }
  },

  async generateWechatReply(contact, playerText) {
    if (!window.dzmm?.completions) return { reply: this.fallbackWechatReply(contact, playerText), elapsedSeconds: 60, impression: 20 };
    try { await this.ensureWechatUserProfile?.(contact); }
    catch (err) { console.warn('[微信] 回复前资料补全失败，继续用现有资料:', err.code, err.message, err.stack); }
    const prompt = await this.wechatReplyPrompt(contact, playerText);
    const result = await window.GameModules.jsonUtils.generateJsonWithRetry({
      source: 'wechat-chat-reply', promptId: 'wechat-chat-reply', model: this.modelId || this.settingsState?.textModelId, timeoutMs: 60000, prompt, format: prompt, max: 2,
      parse: (text) => window.GameModules.jsonUtils.parseLoose(text),
      validate: (raw) => this.validateWechatReply(raw, contact),
    });
    return this.attachWechatMentionedImageIntent?.(result, playerText, this.wechatMessageKey(contact)) || result;
  },

  async wechatReplyPrompt(contact, playerText) {
    const sections = window.GameModules.promptSections;
    const player = sections.playerProfile(this);
    const stateSkill = await window.GameModules.skillLoader?.instruction?.('emotion.feeling.wearing.assess') || '', imageSkill = await window.GameModules.skillLoader?.instruction?.('image.edit.call') || '', memorySkill = await window.GameModules.skillLoader?.instruction?.('memory.query') || '';
    const characterId = this.wechatMessageKey(contact);
    const state = this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId);
    const archive = await this.searchMemoryArchive?.(characterId, playerText) || '无';
    const memoryContext = this.wechatMemoryContext?.(characterId, playerText) || this.memoryQueryContext?.(characterId, playerText) || '暂无人物记忆。';
    const historyContext = await this.wechatHistoryContextForReply?.(characterId, playerText, memoryContext) || this.wechatHistoryQueryHint?.(characterId) || '微信历史默认不载入；需要核对原文时再查询固定历史表。';
    return window.GameModules.renderPrompt('wechat-chat-reply', {
      玩家基础资料区: player.playerBasic,
      玩家现实身份区: player.playerIdentity,
      玩家居住家庭区: player.playerHome,
      玩家人际关系区: player.playerRelations,
      玩家备注区: player.playerNotes,
      联系人资料区: this.wechatContactProfileText(contact, playerText),
      手机时间: `${this.phoneDateText?.() || '未知'} ${this.phoneTimeText?.() || ''}`,
      现实场景: this.realWorldSceneTitle || '现实世界',
      现实地点: this.realWorldLocationName || '未确认',
      现实状态: this.realWorldStatus || '现实稳定',
      目标状态快照: sections.stateSnapshot(this, state),
      微信历史: historyContext,
      提及上下文: this.wechatMentionContextText?.(playerText, characterId) || '无',
      记忆查询结果: [memoryContext, `## 记忆归档\n${archive}`].join('\n\n'),
      玩家消息: playerText,
      状态判定Skill: stateSkill,
      图片编辑Skill: imageSkill,
      记忆查询Skill: memorySkill,
    });
  },

  wechatContactProfileText(contact, playerText = '') {
    const display = this.displayWechatContact?.(contact) || contact;
    const characterId = this.wechatMessageKey(contact);
    const state = this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId);
    const profile = state?.profile || {};
    const rows = [
      ['姓名', profile.name || display.name], ['微信关系', display.relation || display.subtitle], ['角色定位', profile.role || display.context],
      ['背景', profile.detail || contact.latest], ['外貌', profile.appearance], ['性格', profile.personality], ['关系', profile.relationships],
    ];
    const archive = window.GameModules.factionArchive?.contextFor?.(this, `${profile.name || display.name || ''} ${playerText || ''} ${this.realWorldLocationName || ''}`, 1200) || '暂无势力资料库记录。';
    return `${rows.map(([label, value]) => `- ${label}：${String(value || '未记录')}`).join('\n')}\n\n### 相关势力资料库\n${archive}`;
  },


  validateWechatReply(raw, contact) {
    const reply = String(raw?.reply || '').trim().slice(0, 120) || this.fallbackWechatReply(contact, '');
    const impression = Math.max(0, Math.min(100, Math.round(Number(raw?.impression) || 20)));
    const characterId = this.wechatMessageKey(contact);
    const state = this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId);
    const imageRaw = raw?.imageIntent || {};
    const imageIntent = imageRaw.offer ? { offer: true, reason: String(imageRaw.reason || '联系人愿意发送一张图片').slice(0, 120), imageDescription: String(imageRaw.imageDescription || imageRaw.contentDescription || '一张联系人发送的近照。').slice(0, 180), tagsHint: String(imageRaw.tagsHint || '').slice(0, 300), usesMentionedImage: !!imageRaw.usesMentionedImage } : null;
    return { reply, mood: String(raw?.mood || '平常').slice(0, 20), elapsedSeconds: Math.max(20, Math.min(1800, Number(raw?.elapsedSeconds) || 60)), impression, metricUpdates: window.GameModules.ai.normalizeMetricUpdates?.(raw?.metricUpdates, state) || {}, lexiconUpdates: window.GameModules.ai.normalizeLexiconUpdates?.(raw?.lexiconUpdates, { character: { work: '2026 现代都市现实世界' } }) || [], imageIntent };
  },

  fallbackWechatReply(contact, text) {
    const rel = String(contact?.relation || '你').replace(/之一|之二/g, '');
    if (/在吗|你好|嗨|哈喽/.test(text)) return `在呀，怎么突然找我？`;
    return `我看到啦，等我想一下再回你。`;
  },
};


;// ---- wechat-past-event-actions.js ----
window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.wechatChatActions || {}, {
  isWechatPastEventQuestion(text = '') {
    return /几天前|之前|上次|刚才|昨天|那次|还记得|记不记得|记得吗|承诺|照片|图片|以前|发生过|当时|原来|旧/.test(String(text || ''));
  },

  wechatPastEventContext(contact, playerText = '', state = null) {
    if (!this.isWechatPastEventQuestion(playerText)) return '本次消息不是过去事件追问，未触发统一过去事件查询。';
    const characterId = this.wechatMessageKey(contact);
    const profile = state?.profile || {};
    return window.GameModules.pastEventQuery?.query?.(this, 'searchPastEvent', {
      question: playerText,
      contactId: characterId,
      characterId,
      characterName: profile.name || contact?.name || '',
      worldTag: window.GameModules.realWorld2026?.label || '2026 现代都市现实世界',
      maxChars: 5200,
    }) || '过去事件查询不可用。';
  },

  async wechatReplyPrompt(contact, playerText) {
    const sections = window.GameModules.promptSections;
    const player = sections.playerProfile(this);
    const stateSkill = await window.GameModules.skillLoader?.instruction?.('emotion.feeling.wearing.assess') || '', imageSkill = await window.GameModules.skillLoader?.instruction?.('image.edit.call') || '', memorySkill = await window.GameModules.skillLoader?.instruction?.('memory.query') || '';
    const characterId = this.wechatMessageKey(contact);
    const state = this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId);
    const archive = await this.searchMemoryArchive?.(characterId, playerText) || '无';
    const memoryContext = this.wechatMemoryContext?.(characterId, playerText) || this.memoryQueryContext?.(characterId, playerText) || '暂无人物记忆。';
    const historyContext = await this.wechatHistoryContextForReply?.(characterId, playerText, memoryContext) || this.wechatHistoryQueryHint?.(characterId) || '微信历史默认不载入；需要核对原文时再查询固定历史表。';
    return window.GameModules.renderPrompt('wechat-chat-reply', {
      玩家基础资料区: player.playerBasic,
      玩家现实身份区: player.playerIdentity,
      玩家居住家庭区: player.playerHome,
      玩家人际关系区: player.playerRelations,
      玩家备注区: player.playerNotes,
      联系人资料区: this.wechatContactProfileText(contact, playerText),
      手机时间: `${this.phoneDateText?.() || '未知'} ${this.phoneTimeText?.() || ''}`,
      现实场景: this.realWorldSceneTitle || '现实世界',
      现实地点: this.realWorldLocationName || '未确认',
      现实状态: this.realWorldStatus || '现实稳定',
      目标状态快照: sections.stateSnapshot(this, state),
      微信历史: historyContext,
      提及上下文: this.wechatMentionContextText?.(playerText, characterId) || '无',
      记忆查询结果: [memoryContext, `## 记忆归档\n${archive}`].join('\n\n'),
      过去事件查询结果: this.wechatPastEventContext(contact, playerText, state),
      玩家消息: playerText,
      状态判定Skill: stateSkill,
      图片编辑Skill: imageSkill,
      记忆查询Skill: memorySkill,
    });
  },
});


;// ---- wechat-incoming-actions.js ----
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


;// ---- wechat-image-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.wechatImageActions = {
  async appendWechatPendingImageMessage(characterId, state = {}, contact = {}, imageIntent = {}) {
    const contactName = state?.profile?.name || contact.name || '联系人';
    const imageId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const imageDescription = String(imageIntent.imageDescription || imageIntent.contentDescription || '一张联系人发送的近照。').trim().slice(0, 180);
    const time = this.wechatMemoryTime?.() || { label: `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim() };
    const label = this.wechatDialogueTimeLabel?.(time.label) || time.label || '时间未知';
    const imageRecord = this.wechatImageRecordText(contactName, label, imageId, imageDescription);
    this.appendWechatMessage(characterId, { side: 'other', name: contactName, mark: contactName.slice(0, 1), text: '', characterId, imagePending: true, imageStatus: 'pending', imageIntent: { ...imageIntent, imageDescription }, imageId, imageDescription, imageRecord, imageRecordTime: label, imageUnreadBy: ['玩家'], imageReadBy: [] });
    await this.recordWechatImageOffer?.({ ...contact, id: characterId, characterId, name: contactName }, time, imageRecord, imageId, imageIntent);
  },

  wechatImageRecordText(contactName, label, imageId, imageDescription, read = false) {
    const unread = read ? '' : '玩家';
    const readBy = read ? '玩家' : '';
    return `${contactName || '联系人'}（${label || '时间未知'}）已发送图片[${imageId}]（状态：未读人（${unread}），已读人（${readBy}），图片内容：${imageDescription || '一张联系人发送的近照。'}）`;
  },

  wechatImageReadRecord(msg = {}) {
    return this.wechatImageRecordText(msg.name || '联系人', msg.imageRecordTime || msg.atDisplay || msg.at || '时间未知', msg.imageId || '图片ID', msg.imageDescription || msg.imageIntent?.imageDescription || '一张联系人发送的近照。', true);
  },

  async recordWechatImageOffer(contact = {}, time = {}, imageRecord = '', imageId = '', imageIntent = {}) {
    const characterId = String(contact.characterId || contact.id || '').trim();
    if (!characterId || contact.group || !imageRecord) return;
    const cm = window.GameModules.characterMemory;
    const impression = Math.max(0, Math.min(100, Math.round(Number(imageIntent.impression) || 35)));
    for (const id of [characterId, 'player-self']) {
      const memory = cm.ensure(id);
      const item = cm.memoryItem(this, { text: imageRecord, source: 'wechat-image', place: '微信', time, impression });
      memory.shortTerm.recent.push(item);
      cm.promote(memory, item);
      await cm.compact(id, memory);
    }
    const label = this.wechatDialogueTimeLabel?.(time.label) || time.label || '时间未知';
    const seed = window.GameModules.rpgState.seed(`${time.label}-${characterId}-${imageId}`);
    const event = { eventId: `wx_img_${seed}`, name: `微信图片：${contact.name || '联系人'}`, time: label, detail: imageRecord, status: '已记录' };
    this.realWorldlineState = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    this.realWorldlineState.events = [...(this.realWorldlineState.events || []).filter((item) => item.eventId !== event.eventId), event].slice(-40);
    await this.appendWorldlineEvent?.(this.realWorldlineState, event, '现实情节');
  },

  async replaceWechatImageRecord(msg = {}, readRecord = '') {
    const oldRecord = String(msg.imageRecord || '');
    if (!oldRecord || !readRecord) return;
    const cm = window.GameModules.characterMemory;
    const ids = [msg.characterId || this.wechatSelectedContact, 'player-self'].filter(Boolean);
    for (const id of ids) {
      const memory = cm.ensure(id);
      if (this.replaceWechatImageRecordInMemory(memory, oldRecord, readRecord)) await cm.compact(id, memory);
    }
    this.replaceWechatImageRecordInWorldline(oldRecord, readRecord);
  },

  replaceWechatImageRecordInMemory(memory = {}, oldRecord = '', readRecord = '') {
    let changed = false;
    const sections = [memory.shortTerm?.recent, memory.shortTerm?.summaryBuffer, memory.shortTerm?.summarized, memory.shortTerm?.forgotten, memory.longTerm?.vivid, memory.longTerm?.permanent];
    sections.forEach((items) => (items || []).forEach((item) => {
      if (typeof item === 'string') return;
      if (String(item.text || '').includes(oldRecord)) { item.text = String(item.text || '').replace(oldRecord, readRecord); changed = true; }
      if (String(item.summary || '').includes(oldRecord)) { item.summary = String(item.summary || '').replace(oldRecord, readRecord); changed = true; }
    }));
    return changed;
  },

  replaceWechatImageRecordInWorldline(oldRecord = '', readRecord = '') {
    const state = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    this.realWorldlineState = { ...state, events: (state.events || []).map((event) => String(event.detail || '').includes(oldRecord) ? { ...event, detail: String(event.detail || '').replace(oldRecord, readRecord) } : event) };
  },

  openWechatImageConfirm(msg = {}) {
    if (msg.imageStatus !== 'pending') return;
    this.wechatImageConfirmMessage = msg;
    this.wechatImageConfirmOpen = true;
  },

  closeWechatImageConfirm() { if (!this.wechatImageGenerating) this.wechatImageConfirmOpen = false; },

  openWechatImagePreview(url = '', title = '图片预览') {
    if (!url) return;
    this.wechatImagePreview = { open: true, url, title };
  },

  closeWechatImagePreview() { this.wechatImagePreview = { open: false, url: '', title: '' }; },

  wechatImageConfirmPromptText(msg = this.wechatImageConfirmMessage) {
    return String(msg?.imageDescription || msg?.imageIntent?.imageDescription || msg?.imageIntent?.tagsHint || '一张联系人发送的近照。').trim();
  },

  wechatRealPhotoForContact(characterId = this.wechatSelectedContact) {
    const raw = this.wechatAlbumPhotos?.[characterId];
    const list = Array.isArray(raw) ? raw : (raw?.url ? [raw] : []);
    return list.find((item) => item?.url && item.real) || null;
  },

  addWechatImageToAlbum(characterId = '', photo = {}) {
    const id = characterId || this.wechatSelectedContact;
    if (!id || !photo.url) return;
    const raw = this.wechatAlbumPhotos?.[id];
    const list = Array.isArray(raw) ? raw.filter((item) => item?.url) : (raw?.url ? [raw] : []);
    if (list.some((item) => item.url === photo.url)) return;
    this.wechatAlbumPhotos = { ...(this.wechatAlbumPhotos || {}), [id]: [{
      url: photo.url,
      kind: 'wechat-image',
      taskId: photo.taskId || '',
      real: false,
      source: 'wechat-chat',
      imageId: photo.imageId || '',
      prompt: photo.prompt || '',
      tags: photo.tags || '',
      description: photo.description || '',
      createdAt: new Date().toISOString(),
    }, ...list] };
  },

  wechatMemorySections(characterId = '') {
    const memory = window.GameModules.characterMemory?.ensure?.(characterId);
    if (!memory) return { shortText: '无', longText: '无' };
    const cm = window.GameModules.characterMemory;
    const shortText = [cm.section('刚发生记忆', memory.shortTerm?.recent), cm.section('归纳总结区', memory.shortTerm?.summaryBuffer), cm.section('近发生记忆', memory.shortTerm?.summarized), cm.section('遗忘区', memory.shortTerm?.forgotten)].join('\n');
    const longText = [cm.section('难以忘记的记忆', memory.longTerm?.vivid), cm.section('不可忘记的记忆', memory.longTerm?.permanent)].join('\n');
    return { shortText, longText };
  },

  wechatWearingContext(state = {}) {
    const list = this.wearingItems?.(state) || [];
    return list.map((item) => `- ${this.wearingName?.(item) || item?.name || '未穿戴'}：${this.wearingDetail?.(item) || ''}`).join('\n') || '无当前穿戴记录';
  },

  cleanWechatImageTags(text = '') { return this.cleanWechatAlbumTags ? this.cleanWechatAlbumTags(text) : String(text || '').trim(); },

  async buildWechatImageTags(msg = {}) {
    const characterId = msg.characterId || this.wechatSelectedContact;
    const contact = this.wechatContacts?.().find((item) => item.id === characterId) || this.wechatSelected?.() || {};
    const state = this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId) || await this.ensureWechatUserProfile?.(contact);
    const memory = this.wechatMemorySections(characterId);
    const prompt = await window.GameModules.renderPrompt('wechat-image-prompt-collect', {
      联系人资料区: this.wechatContactProfileText(contact),
      目标状态快照: window.GameModules.promptSections.stateSnapshot(this, state),
      短期记忆区: memory.shortText,
      长期记忆区: memory.longText,
      当前穿戴区: this.wechatWearingContext(state),
      微信历史: this.wechatHistoryText(characterId),
      自拍意图: [msg.imageIntent?.reason || '', msg.imageIntent?.imageDescription || '', msg.imageIntent?.tagsHint || ''].filter(Boolean).join('\n') || '发送一张当前自拍照',
    });
    const output = await window.GameModules.aiRequest.complete({
      source: 'wechat-image-prompt-collect',
      model: this.modelId || this.settingsState?.textModelId,
      prompt,
      maxTokens: 500,
      timeoutMs: 60000,
      requireDone: true,
      ...(window.GameModules.promptSkills?.completionOptions?.('wechat-image-prompt-collect') || { jsonMode: false, outputLimitKind: 'other' }),
      tokenMeta: { title: `微信图片提示词收集｜${contact.name || '联系人'}`, category: '图片生成', summary: '根据微信联系人记忆和穿戴生成图片编辑动态标签。', kind: 'completion' },
    });
    return window.GameModules.applyPictureGenerateSensitiveReplacements?.(this.cleanWechatImageTags(output)).slice(0, 1000) || this.cleanWechatImageTags(output).slice(0, 1000);
  },

  updateWechatImageMessage(targetMsg = {}, patch = {}) {
    const key = targetMsg.characterId || this.wechatSelectedContact;
    const same = (msg) => msg.imagePending && msg.time === targetMsg.time && msg.characterId === targetMsg.characterId;
    const list = (this.wechatMessagesByContact?.[key] || []).map((msg) => same(msg) ? { ...msg, ...patch } : msg);
    this.wechatMessagesByContact = { ...(this.wechatMessagesByContact || {}), [key]: list };
    this.wechatImageConfirmMessage = list.find(same) || null;
  },

  async confirmWechatImageReceive() {
    const msg = this.wechatImageConfirmMessage;
    if (!msg || this.wechatImageGenerating) return;
    const photo = this.wechatImageBasePhoto?.(msg) || this.wechatRealPhotoForContact(msg.characterId);
    if (!photo?.url) { this.wechatError = '请先在相册中标记一张角色真实照片或@一张可编辑图片'; this.wechatImageConfirmOpen = false; return; }
    const reqId = (this.wechatImageRequestId || 0) + 1;
    this.wechatImageRequestId = reqId;
    this.wechatImageGenerating = true;
    this.updateWechatImageMessage(msg, { imageStatus: 'generating' });
    try {
      const tags = await this.buildWechatImageTags(msg);
      const prompt = await window.GameModules.renderPrompt('common-image-edit-generate', { 动态标签: tags });
      const drawOptions = { prompt: prompt.slice(0, 2000), images: [photo.url], dimension: '2:3', model: 'lite' };
      const tokenRecordId = window.GameModules.tokenStats?.record?.('draw-edit-wechat-image', drawOptions.prompt, { model: drawOptions.model, title: '微信图片编辑生成', category: '图片生成', summary: '使用角色真实照片编辑生成微信图片。', kind: 'draw' });
      const result = await this.wechatDrawWithRetry(() => window.dzmm.draw.edit(drawOptions));
      window.GameModules.tokenStats?.recordResponse?.(tokenRecordId, JSON.stringify(result || {}, null, 2), result?.images || []);
      if (reqId !== this.wechatImageRequestId) return;
      const url = result?.images?.[0] || '';
      if (!url) throw new Error('图片编辑完成但没有返回图片');
      this.addWechatImageToAlbum?.(msg.characterId, { url, taskId: result.taskId || '', imageId: msg.imageId || '', prompt: drawOptions.prompt, tags, description: msg.imageDescription || msg.imageIntent?.imageDescription || '' });
      const readRecord = this.wechatImageReadRecord(msg);
      await this.replaceWechatImageRecord?.(msg, readRecord);
      this.updateWechatImageMessage(msg, { imageStatus: 'done', imageUrl: url, taskId: result.taskId || '', text: '[图片]', imageRecord: readRecord, imageUnreadBy: [], imageReadBy: ['玩家'] });
      await this.save?.();
      this.wechatImageConfirmOpen = false;
    } catch (err) {
      if (reqId !== this.wechatImageRequestId) return;
      console.error('[微信图片] 图片生成失败:', err.code, err.message, err.stack);
      this.wechatError = err.message || '图片生成失败';
      this.updateWechatImageMessage(msg, { imageStatus: 'pending' });
    } finally {
      if (reqId === this.wechatImageRequestId) this.wechatImageGenerating = false;
    }
  },
};


;// ---- wechat-mention-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.wechatMentionActions = {
  insertWechatMention(text = '') {
    const value = String(this.wechatInput || '');
    const gap = value && !/\s$/.test(value) ? ' ' : '';
    this.wechatInput = `${value}${gap}${text} `;
  },

  mentionWechatMessage(msg = {}, index = 0) {
    this.insertWechatMention(`@消息${this.wechatMessageMentionId(msg, index)}`);
  },

  mentionWechatImage(msg = {}, index = 0) {
    this.insertWechatMention(`@图片${this.wechatMessageImageMentionId(msg, index)}`);
  },

  wechatImageMentionId(photo = {}, index = 0) {
    return String(photo.imageId || photo.taskId || `album-${index}`).trim();
  },

  wechatMessageMentionId(msg = {}, index = 0) {
    const raw = `${msg.side || 'msg'}-${msg.at || ''}-${msg.text || msg.imageDescription || ''}-${index}`;
    const seed = window.GameModules.rpgState?.seed?.(raw) || index;
    return String(msg.messageId || `msg-${seed}`).trim();
  },

  wechatMessageImageMentionId(msg = {}, index = 0) {
    return String(msg.imageId || msg.taskId || `chat-img-${this.wechatMessageMentionId(msg, index)}`).trim();
  },

  wechatMentionedContacts(text = '') {
    const raw = String(text || '');
    return (this.wechatContacts?.() || []).filter((item) => !item.group && item.name && raw.includes(`@${item.name}`)).slice(0, 5);
  },

  wechatMentionedImages(text = '', currentId = '') {
    const ids = [];
    const raw = String(text || '');
    raw.replace(/@(?:图片)?([A-Za-z0-9_-]+)|图片\[([^\]]+)\]/g, (_, a, b) => { ids.push(String(a || b || '').trim()); return ''; });
    if (!ids.length) return [];
    const sources = this.wechatImageMentionSources(currentId);
    return ids.map((id) => sources.find((item) => [item.id, item.imageId, item.taskId].includes(id))).filter(Boolean).slice(0, 4);
  },

  wechatMentionedMessages(text = '', currentId = '') {
    const ids = [];
    String(text || '').replace(/@消息([A-Za-z0-9_-]+)/g, (_, id) => { ids.push(String(id || '').trim()); return ''; });
    if (!ids.length) return [];
    const sources = this.wechatMessageMentionSources(currentId);
    return ids.map((id) => sources.find((item) => item.id === id)).filter(Boolean).slice(0, 4);
  },

  wechatMessageMentionSources(currentId = '') {
    const list = this.wechatMessagesByContact?.[currentId] || [];
    return list.map((msg, index) => ({
      id: this.wechatMessageMentionId(msg, index),
      text: msg.imageRecord || msg.text || msg.imageDescription || '',
      side: msg.side || '',
      sender: msg.side === 'self' ? '玩家' : (msg.name || '联系人'),
      time: msg.atDisplay || msg.at || '',
    })).filter((item) => item.text).slice(-12);
  },

  wechatImageMentionSources(currentId = '') {
    const out = [];
    const push = (item = {}) => {
      if (!item.url) return;
      const id = String(item.id || item.imageId || item.taskId || '').trim();
      if (!id || out.some((old) => old.id === id || old.url === item.url)) return;
      out.push({ ...item, id });
    };
    Object.entries(this.wechatMessagesByContact || {}).forEach(([contactId, list]) => (list || []).forEach((msg, index) => push({
      id: this.wechatMessageImageMentionId(msg, index),
      imageId: msg.imageId || '',
      taskId: msg.taskId || '',
      url: msg.imageUrl || '',
      description: msg.imageDescription || msg.imageIntent?.imageDescription || '',
      source: contactId === currentId ? '当前微信对话' : '其它微信对话',
    })));
    Object.entries(this.wechatAlbumPhotos || {}).forEach(([contactId, raw]) => (Array.isArray(raw) ? raw : (raw?.url ? [raw] : [])).forEach((photo, index) => push({
      id: this.wechatImageMentionId(photo, index),
      imageId: photo.imageId || '',
      taskId: photo.taskId || '',
      url: photo.url || '',
      description: photo.description || photo.prompt || '',
      source: contactId === currentId ? '当前联系人相册' : '其它联系人相册',
    })));
    return out;
  },

  wechatMentionContextText(playerText = '', currentId = '') {
    const contacts = this.wechatMentionedContacts(playerText);
    const messages = this.wechatMentionedMessages(playerText, currentId);
    const images = this.wechatMentionedImages(playerText, currentId);
    if (!contacts.length && !messages.length && !images.length) return '无';
    const contactText = contacts.map((item) => `### @${item.name}\n${this.wechatContactProfileText?.(item) || item.name}`).join('\n');
    const messageText = messages.map((item) => `- 消息ID：${item.id}\n  发送人：${item.sender}\n  时间：${item.time || '未知'}\n  内容：${item.text}`).join('\n');
    const imageText = images.map((item) => `- 图片ID：${item.id}\n  来源：${item.source || '微信图片'}\n  描述：${item.description || '无描述'}`).join('\n');
    return [contactText && `## @联系人\n${contactText}`, messageText && `## @消息\n${messageText}`, imageText && `## @图片\n${imageText}`].filter(Boolean).join('\n\n');
  },

  attachWechatMentionedImageIntent(result = {}, playerText = '', currentId = '') {
    const image = this.wechatMentionedImages(playerText, currentId)[0];
    if (!result?.imageIntent?.offer || !result.imageIntent.usesMentionedImage || !image?.url) return result;
    result.imageIntent = { ...result.imageIntent, baseImage: { id: image.id, url: image.url, description: image.description || '', source: image.source || '' } };
    return result;
  },

  wechatImageBasePhoto(msg = {}) {
    const base = msg.imageIntent?.baseImage || msg.baseImage;
    return base?.url ? { url: base.url, taskId: base.taskId || '', imageId: base.id || '', description: base.description || '' } : null;
  },
};


;// ---- wechat-worldline-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.wechatWorldlineActions = {
  async recordWechatWorldline(contact, playerText, replyText = '', result = {}) {
    const display = this.displayWechatContact?.(contact) || contact || {};
    const time = this.wechatMemoryTime?.() || { label: `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim() };
    const label = this.wechatDialogueTimeLabel?.(time.label) || time.label || '时间未知';
    const playerName = this.playerDisplayCharacter?.().name || this.playerName || '玩家';
    const detail = this.formatWechatDialogueLog?.(playerName, display.name || '微信联系人', label, playerText, replyText) || '';
    const seed = window.GameModules.rpgState.seed(`${time.label}-${contact?.id}-${playerText}-${replyText}`);
    const event = { eventId: `wx_${seed}`, name: `微信对话：${display.name || '联系人'}`, time: label, detail, status: '已记录' };
    this.realWorldlineState = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    this.realWorldlineState.events = [...(this.realWorldlineState.events || []).filter((item) => item.eventId !== event.eventId), event].slice(-40);
    await this.appendWorldlineEvent?.(this.realWorldlineState, event, '现实情节');
  },
};


;// ---- wechat-memory-debug-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.wechatMemoryDebugActions = {
  debugWechatMemory(contact = this.wechatSelected?.()) {
    if (!contact || contact.group) return null;
    const characterId = this.wechatMessageKey(contact);
    const state = this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId);
    const messages = this.wechatMessagesByContact?.[characterId] || [];
    const memory = this.sqliteWechatMemory(characterId);
    const latestMemory = [...(memory?.shortTerm?.recent || []), ...(memory?.shortTerm?.summarized || [])].slice(-3).map((item) => item.summary || item.text);
    const worldline = this.sqliteWechatWorldline();
    const report = {
      contact: contact.name,
      characterId,
      stateFound: Boolean(state),
      messageCount: messages.length,
      lastMessages: messages.slice(-4).map((msg) => `${msg.side}:${msg.text}`),
      worldlineWechatCount: worldline.length,
      latestWorldline: worldline.slice(-3).map((event) => `${event.time || ''}｜${event.detail || event.name || ''}`),
      memoryExists: Boolean(memory),
      recentCount: memory?.shortTerm?.recent?.length || 0,
      summarizedCount: memory?.shortTerm?.summarized?.length || 0,
      latestMemory,
      archiveCount: this.sqliteWechatArchiveCount(characterId),
    };
    console.log('[微信记忆检查]', report);
    return report;
  },

  sqliteWechatMemory(characterId) {
    if (!characterId || !window.GameModules.sqliteSave?.db) return null;
    try { return window.GameModules.characterMemory?.ensure?.(characterId) || null; }
    catch (err) { console.warn('[微信记忆检查] 读取记忆失败:', err.message, err.stack); return null; }
  },

  sqliteWechatWorldline() {
    const db = window.GameModules.sqliteSave?.db;
    if (!db) return this.memoryDebugRuntimeWorldline();
    const rows = [];
    try {
      const stmt = db.prepare('SELECT event_json FROM worldline_events ORDER BY updated_at');
      while (stmt.step()) {
        const event = JSON.parse(stmt.getAsObject().event_json);
        if (String(event.eventId || '').startsWith('wx_') || String(event.detail || '').includes('以下来自微信对话')) rows.push(event);
      }
      stmt.free();
    } catch (err) { console.warn('[微信记忆检查] 读取世界线表失败:', err.message, err.stack); }
    return rows.length ? rows : this.memoryDebugRuntimeWorldline();
  },

  memoryDebugRuntimeWorldline() {
    return (this.realWorldlineState?.events || []).filter((event) => String(event.eventId || '').startsWith('wx_') || String(event.detail || '').includes('以下来自微信对话'));
  },

  sqliteWechatArchiveCount(characterId) {
    if (!characterId) return 0;
    try { return window.GameModules.sqliteSave?.listMemoryArchives?.(characterId)?.length || 0; }
    catch (_) { return 0; }
  },
};


;// ---- wechat-app-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.wechatAppActions = {
  openWechatApp() {
    this.syncRelationshipWechatUsers?.({ generateProfile: false, save: false });
    this.identityAppOpen = false; this.saveAppOpen = false; this.roleCardJsonAppOpen = false; this.worldlineAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.promptState) this.promptState.open = false; if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.wechatAppOpen = true; this.desktopUnlocked = true;
    if (this.syncWechatContactsFromRpgStates?.()) this.save?.();
    this.wechatTab = this.wechatTab || 'chats';
    this.wechatView = this.wechatView || 'home';
    setTimeout(() => this.debugWechatMemory?.(), 0);
  },
  closeWechatApp() { this.closeAppToDesktop(); },
  async openWechatIdentity() {
    const contact = this.wechatSelected?.();
    const id = contact?.group ? 'player-self' : (contact?.id || this.wechatSelectedContact || 'player-self');
    await this.openIdentityApp(id, 'wechat');
  },
};


;// ---- wechat-album-tags.js ----
window.GameModules = window.GameModules || {};
window.GameModules.wechatAlbumTagActions = {
  wechatAlbumFixedNaturalTags() { return 'natural, original body, no clothes'; },

  wechatAlbumStructuredTags(items = []) {
    return [...new Set((items || []).map((item) => String(item?.value || '').trim())
      .filter((value) => value && value !== '未记录'))].join('，');
  },

  wechatAlbumTagContext(contact, kind = 'natural', draft = null) {
    const { state, profile } = this.wechatAlbumStateData(contact);
    const selected = draft ? this.wechatAlbumSelectedText() : null;
    const identityItems = selected?.identityItems || this.wechatAlbumIdentityItems(contact, state, profile);
    const defaultBodyItems = this.wechatAlbumBodyItems(kind === 'dressed' ? profile.dressedProfile : profile.bodyProfile);
    const bodyItems = selected?.bodyItems?.length ? selected.bodyItems : defaultBodyItems;
    const bodyText = selected?.bodyText || bodyItems.map((item) => item.text).join('\n');
    const extraText = selected?.extraText ? `，${selected.extraText}` : '';
    const bodyBase = kind === 'custom' ? bodyText : this.wechatAlbumStructuredTags(bodyItems);
    const naturalTags = kind === 'natural' ? `，${this.wechatAlbumFixedNaturalTags()}` : '';
    return {
      identityTags: this.wechatAlbumStructuredTags(identityItems),
      bodyTags: `${bodyBase}${extraText}${naturalTags}`,
    };
  },

  renderWechatAlbumPrompt(template, vars) {
    return String(template || '').replace(/\{角色身份信息标签\}/g, vars.identityTags || '')
      .replace(/\{状态部位描述标签\}/g, vars.bodyTags || '');
  },

  cleanWechatAlbumTags(text = '') {
    return [...new Set(String(text || '').replace(/```[a-z]*|```/gi, '')
      .replace(/^(正向提示词|正向|绘图提示词|提示词|负面提示词|负向提示词|负向|positive\s*prompt|negative\s*prompt|positive|negative|prompt|tags)\s*[:：]/gim, '')
      .replace(/\b(positive\s*prompt|negative\s*prompt|positive|negative|prompt|tags)\s*[:：]/gi, '\n')
      .split(/[\n,，、；;]+/).map((item) => item.trim().replace(/^[-*]\s*/, ''))
      .filter(Boolean))].join(', ');
  },


  parseWechatAlbumDrawPrompt(text = '') {
    const raw = String(text || '').replace(/\r/g, '').replace(/```[a-z]*|```/gi, '').trim();
    const positiveLabel = '(?:正向提示词|正向|绘图提示词|提示词|positive\\s*prompt|positive|prompt|tags)';
    const negativeLabel = '(?:负面提示词|负向提示词|负向|negative\\s*prompt|negative)';
    const positiveMatch = raw.match(new RegExp(`${positiveLabel}\\s*[:：]\\s*([\\s\\S]*?)(?=\\n?\\s*${negativeLabel}\\s*[:：]|$)`, 'i'));
    const negativeMatch = raw.match(new RegExp(`${negativeLabel}\\s*[:：]\\s*([\\s\\S]*)$`, 'i'));
    const defaultPositive = 'solo, full body, standing, front view, clear face, clean background, anime style, high quality';
    const defaultNegative = 'bad anatomy, extra fingers, extra arms, missing fingers, low quality, blurry, worst quality, watermark, text, logo, bad hands';
    const rawWithoutNegative = raw.replace(new RegExp(`${negativeLabel}\\s*[:：][\\s\\S]*$`, 'i'), '').trim();
    const positiveSource = positiveMatch?.[1] || rawWithoutNegative || raw;
    const positive = this.cleanWechatAlbumTags(positiveSource) || defaultPositive;
    const negative = this.cleanWechatAlbumTags(negativeMatch?.[1] || defaultNegative) || defaultNegative;
    return { prompt: positive, negativePrompt: negative };
  },


  async buildWechatAlbumDrawPrompt(contact, kind = 'natural', draft = null) {
    const ctx = this.wechatAlbumTagContext(contact, kind, draft);
    const template = window.GameModules.pictureGeneratePrompts?.drawTagPrompt || '';
    const requestPrompt = this.renderWechatAlbumPrompt(template, ctx);
    const model = this.modelId || this.settingsState?.textModelId;
    const titleState = this.wechatAlbumKindLabel(kind);
    const output = await window.GameModules.aiRequest.complete({
      source: 'draw-tag-prompt',
      model,
      prompt: requestPrompt,
      maxTokens: 600,
      timeoutMs: 60000,
      requireDone: true,
      ...(window.GameModules.promptSkills?.completionOptions?.('draw-tag-prompt') || { jsonMode: false, outputLimitKind: 'other' }),
      tokenMeta: { title: `绘图提示词生成｜${contact.name || '联系人'}｜${titleState}`, category: '图片生成', summary: '根据微信相册素材生成正向/负面绘图提示词。', kind: 'completion' },
    });
    console.log('[微信相册] 绘图提示词 AI 原始返回:', output);
    const parsed = this.parseWechatAlbumDrawPrompt(output);
    const prompt = window.GameModules.applyPictureGenerateSensitiveReplacements(parsed.prompt);
    const negativePrompt = window.GameModules.applyPictureGenerateSensitiveReplacements(parsed.negativePrompt);
    return { prompt: prompt.slice(0, 2000), negativePrompt: negativePrompt.slice(0, 2000), source: requestPrompt, raw: output };
  },
};


;// ---- wechat-album-prompt-list.js ----
window.GameModules = window.GameModules || {};
window.GameModules.wechatAlbumPromptListActions = {
  wechatAlbumPromptList(contact = this.wechatProfileContact()) {
    return (this.wechatAlbumPrompts?.[contact?.id || 'player-self'] || []).filter((item) => item?.prompt);
  },

  wechatAlbumSelectedPrompt() {
    return this.wechatAlbumPromptList().find((item) => item.id === this.wechatAlbumPromptSelectedId) || null;
  },

  wechatAlbumPromptListPreview(item) {
    const fixed = new Set(['1girl or 1boy', '1girl', '1boy', 'solo', 'full body', 'standing', 'front view', 'clear face', 'clean background', 'anime style', 'high quality', 'natural', 'original body', 'no clothes']);
    const tags = String(item?.prompt || '').split(/[\n,，、；;]+/).map((tag) => tag.trim()).filter(Boolean);
    const distinct = tags.filter((tag) => !fixed.has(tag.toLowerCase()));
    return (distinct.length ? distinct : tags).slice(0, 8).join(', ').slice(0, 88) || '未命名提示词';
  },

  async generateWechatAlbumPromptOnly() {
    if (this.wechatAlbumGenerating) return;
    const contact = this.wechatProfileContact();
    const kind = this.wechatAlbumPromptDraft?.kind || 'natural';
    const reqId = (this.wechatAlbumRequestId || 0) + 1;
    this.wechatAlbumRequestId = reqId;
    this.wechatAlbumGenerating = true;
    try {
      await this.ensureWechatUserProfile?.(contact);
      const built = await this.buildWechatAlbumDrawPrompt(contact, kind, this.wechatAlbumPromptDraft);
      if (reqId !== this.wechatAlbumRequestId) return;
      const item = { id: `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, prompt: built.prompt, negativePrompt: built.negativePrompt, raw: built.raw || '', createdAt: new Date().toISOString() };
      const list = this.wechatAlbumPromptList(contact);
      this.wechatAlbumPrompts = { ...(this.wechatAlbumPrompts || {}), [contact.id]: [item, ...list].slice(0, 30) };
      this.wechatAlbumPromptSelectedId = item.id;
      this.wechatAlbumPromptEditText = item.prompt;
      this.wechatAlbumPromptEditNegative = item.negativePrompt;
      this.wechatAlbumPromptStep = 'prompt-list';
      await this.save?.();
    } catch (err) {
      console.error('[微信相册] 绘图提示词生成失败:', err.code, err.message, err.stack);
      this.wechatError = err?.message || '绘图提示词生成失败，请稍后重试。';
    } finally {
      if (reqId === this.wechatAlbumRequestId) this.wechatAlbumGenerating = false;
    }
  },

  openWechatAlbumPromptList() { this.wechatAlbumPromptStep = 'prompt-list'; },

  addWechatAlbumPrompt() {
    this.wechatAlbumPromptSelectedId = '';
    this.wechatAlbumPromptEditText = '';
    this.wechatAlbumPromptEditNegative = 'bad anatomy, extra fingers, extra arms, missing fingers, low quality, blurry, worst quality, watermark, text, logo, bad hands';
    this.wechatAlbumPromptStep = 'prompt-detail';
  },

  selectWechatAlbumPrompt(id) {
    this.wechatAlbumPromptSelectedId = id;
    const item = this.wechatAlbumSelectedPrompt();
    this.wechatAlbumPromptEditText = item?.prompt || '';
    this.wechatAlbumPromptEditNegative = item?.negativePrompt || '';
    this.wechatAlbumPromptStep = 'prompt-detail';
  },

  async saveWechatAlbumManualPrompt() {
    const prompt = String(this.wechatAlbumPromptEditText || '').trim();
    if (!prompt) {
      this.wechatError = '请先填写正向提示词';
      return;
    }
    const contact = this.wechatProfileContact();
    const kind = this.wechatAlbumPromptDraft?.kind || 'custom';
    const negativePrompt = String(this.wechatAlbumPromptEditNegative || '').trim();
    const item = { id: `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, prompt, negativePrompt, raw: '', manual: true, createdAt: new Date().toISOString() };
    const list = this.wechatAlbumPromptList(contact);
    this.wechatAlbumPrompts = { ...(this.wechatAlbumPrompts || {}), [contact.id]: [item, ...list].slice(0, 30) };
    this.wechatAlbumPromptSelectedId = item.id;
    this.wechatAlbumPromptStep = 'prompt-list';
    await this.save?.();
  },
};


;// ---- wechat-avatar-crop-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.wechatAvatarCropActions = {
  wechatAvatarText(contact = this.wechatProfileContact()) {
    return String(contact?.mark || contact?.name?.slice(0, 1) || '微').slice(0, 2);
  },

  wechatAvatarStyle(contact = this.wechatProfileContact()) {
    const avatar = contact?.avatar || {};
    if (!avatar.url) return '';
    const crop = avatar.crop || this.defaultWechatAvatarCrop();
    const w = Math.min(0.95, Math.max(0.18, Number(crop.w) || 0.52));
    const ratio = Math.max(0.5, Number(crop.ratio) || 1.5);
    const h = Math.min(0.95, w / ratio);
    const x = Math.min(1 - w, Math.max(0, Number(crop.x) || 0));
    const y = Math.min(1 - h, Math.max(0, Number(crop.y) || 0));
    const px = (1 - w) > 0 ? (x / (1 - w)) * 100 : 50;
    const py = (1 - h) > 0 ? (y / (1 - h)) * 100 : 50;
    return `background-image:url("${String(avatar.url).replace(/"/g, '%22')}");background-size:${100 / w}% auto;background-position:${px}% ${py}%;color:transparent;`;
  },

  defaultWechatAvatarCrop(ratio = 1.5) { return { x: 0.24, y: 0.04, w: 0.52, ratio }; },

  wechatMessageAvatarContact(msg = {}) {
    if (msg.side === 'self') return { name: this.playerDisplayCharacter?.().name || this.playerName || '我', mark: '我' };
    const id = msg.characterId || this.wechatSelectedContact;
    return this.wechatContacts?.().find((item) => item.id === id) || this.wechatSelected?.() || { name: msg.name || '', mark: msg.mark || '微' };
  },

  loadWechatAvatarImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = url;
    });
  },

  async detectWechatAvatarFace(img) {
    const native = await this.detectWechatAvatarByFaceDetector(img);
    if (native) return native;
    return this.detectWechatAvatarByLocalLibrary(img);
  },

  async detectWechatAvatarByFaceDetector(img) {
    if (!window.FaceDetector) return null;
    try {
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(img);
      return faces?.[0]?.boundingBox ? this.wechatFaceBoxToCrop(faces[0].boundingBox, img) : null;
    } catch (err) {
      console.warn('[微信相册] FaceDetector 识别失败:', err.message, err.stack);
      return null;
    }
  },

  async detectWechatAvatarByLocalLibrary(img) {
    const detector = window.GameModules.localFaceDetector || window.localFaceDetector;
    if (!detector?.detect) return null;
    try {
      const faces = await detector.detect(img);
      const face = Array.isArray(faces) ? faces[0] : faces;
      const box = face?.boundingBox || face?.box || face;
      return box ? this.wechatFaceBoxToCrop(box, img) : null;
    } catch (err) {
      console.warn('[微信相册] 本地人脸库识别失败:', err.message, err.stack);
      return null;
    }
  },

  wechatFaceBoxToCrop(box, img) {
    const width = img.naturalWidth || img.width || 1;
    const height = img.naturalHeight || img.height || 1;
    const bx = Number(box.x ?? box.left) || 0;
    const by = Number(box.y ?? box.top) || 0;
    const bw = Number(box.width ?? box.w) || width * 0.28;
    const bh = Number(box.height ?? box.h) || height * 0.2;
    const size = Math.min(width, Math.max(bw, bh) * 2.05);
    const left = Math.min(width - size, Math.max(0, bx + bw / 2 - size / 2));
    const top = Math.min(height - size, Math.max(0, by + bh * 0.48 - size * 0.45));
    return { x: left / width, y: top / height, w: size / width, ratio: height / width };
  },

  async autoCaptureWechatAvatar(index = 0) {
    const photo = this.wechatAlbumPhotoList()[index];
    if (!photo?.url) return;
    let crop = this.defaultWechatAvatarCrop();
    try {
      const img = await this.loadWechatAvatarImage(photo.url);
      crop = await this.detectWechatAvatarFace(img) || this.defaultWechatAvatarCrop((img.naturalHeight || 1) / (img.naturalWidth || 1));
    } catch (err) {
      console.warn('[微信相册] 自动截取头像失败，使用固定构图:', err.message, err.stack);
    }
    await this.applyWechatAvatarCrop(photo.url, crop);
  },

  async applyWechatAvatarCrop(url, crop) {
    const contact = this.wechatProfileContact();
    if (!contact?.id) return;
    const avatar = { url, crop };
    this.wechatUsers = (this.wechatUsers || []).map((item) => item.id === contact.id ? { ...item, avatar } : item);
    await this.save?.();
  },

  async openWechatAvatarCrop(index = 0) {
    const photo = this.wechatAlbumPhotoList()[index];
    if (!photo?.url) return;
    this.wechatAvatarCropPhotoIndex = index;
    this.wechatAvatarCropState = { url: photo.url, x: 24, y: 4, scale: 1.92, ratio: 1.5 };
    this.wechatAvatarCropOpen = true;
    try {
      const img = await this.loadWechatAvatarImage(photo.url);
      this.wechatAvatarCropState.ratio = (img.naturalHeight || 1) / (img.naturalWidth || 1);
    } catch (err) {
      console.warn('[微信相册] 裁剪预览图片加载失败:', err.message, err.stack);
    }
  },

  closeWechatAvatarCrop() { this.wechatAvatarCropOpen = false; },

  wechatAvatarCropImageStyle() {
    const s = this.wechatAvatarCropState || {};
    const scale = Math.max(1, Number(s.scale) || 1.92);
    const ratio = Math.max(0.5, Number(s.ratio) || 1.5);
    const x = Math.max(0, Number(s.x) || 0);
    const y = Math.max(0, Number(s.y) || 0);
    return `width:${scale * 100}%;left:${-x * scale}%;top:${-y * scale * ratio}%;`;
  },

  async saveWechatAvatarCrop() {
    const s = this.wechatAvatarCropState || {};
    const scale = Math.max(1, Number(s.scale) || 1.92);
    const ratio = Math.max(0.5, Number(s.ratio) || 1.5);
    const w = 1 / scale;
    const h = w / ratio;
    const crop = {
      x: Math.min(1 - w, Math.max(0, (Number(s.x) || 0) / 100)),
      y: Math.min(1 - h, Math.max(0, (Number(s.y) || 0) / 100)),
      w,
      ratio,
    };
    await this.applyWechatAvatarCrop(s.url, crop);
    this.wechatAvatarCropOpen = false;
  },
};


;// ---- wechat-album-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.wechatAlbumActions = {
  openWechatContactProfile(id = '') {
    this.wechatSelectedContact = id || this.wechatSelectedContact || 'player-self';
    if (this.wechatSelected?.()?.group) return;
    this.wechatView = 'profile';
    this.wechatAlbumMode = 'profile';
    const contact = this.wechatSelected?.();
    if (contact && !contact.group) this.ensureWechatUserProfile?.(contact).then(() => this.save?.()).catch((err) => console.warn('[微信] 联系人资料补全失败:', err.code, err.message, err.stack));
  },

  backWechatContactProfile() {
    if (this.wechatAlbumMode === 'album') { this.wechatAlbumMode = 'profile'; return; }
    this.wechatView = 'home';
    this.wechatAlbumMode = 'profile';
  },

  openWechatAlbum() { this.wechatAlbumMode = 'album'; },
  wechatProfileContact() { return this.wechatSelected?.() || { id: 'player-self', name: '联系人', mark: '联' }; },
  wechatAlbumPhotoList() {
    const raw = this.wechatAlbumPhotos?.[this.wechatProfileContact()?.id || 'player-self'];
    if (Array.isArray(raw)) return raw.filter((item) => item?.url);
    return raw?.url ? [raw] : [];
  },
  wechatAlbumPhoto() { return this.wechatAlbumPhotoList()[0] || null; },
  refreshWechatAlbum() {
    const contact = this.wechatProfileContact();
    if (!contact?.id) return;
    const list = this.wechatAlbumPhotoList();
    this.wechatAlbumPhotos = { ...(this.wechatAlbumPhotos || {}), [contact.id]: [...list] };
  },

  wechatAlbumChoiceOpen() {
    this.wechatAlbumPromptStep = 'choice';
    this.wechatAlbumPromptDraft = { kind: 'natural', identityKeys: [], bodyKeys: [], customText: '', extraText: '' };
    this.wechatAlbumPromptOpen = true;
  },
  wechatAlbumChoiceClose() { if (!this.wechatAlbumGenerating) this.wechatAlbumPromptOpen = false; },

  async openWechatAlbumPromptEditor(kind = 'natural') {
    const contact = this.wechatProfileContact();
    await this.ensureWechatUserProfile?.(contact);
    const options = this.wechatAlbumPromptOptions(kind);
    this.wechatAlbumPromptDraft = {
      kind,
      identityKeys: options.identity.map((item) => item.key),
      bodyKeys: options.body.map((item) => item.key),
      customText: '',
      extraText: '',
    };
    this.wechatAlbumPromptStep = 'edit';
  },

  wechatAlbumStateData(contact = this.wechatProfileContact()) {
    const state = this.rpgStates?.[contact.id] || window.GameModules.sqliteSave?.getCharacterState?.(contact.id) || {};
    return { state, profile: state.profile || {} };
  },
  wechatAlbumIdentityItems(contact = this.wechatProfileContact(), state = {}, profile = {}) {
    return [
      ['name', '姓名', profile.name || contact.name || '未记录'], ['role', '身份', profile.role || contact.relation || '微信联系人'],
      ['gender', '性别', profile.gender || '未记录'], ['age', '年龄/生日', `${profile.age || state.values?.age || '未记录'} / ${profile.birthday || '未记录'}`],
      ['job', '职业', profile.job || '未记录'], ['appearance', '外貌', profile.appearance || '未记录'],
      ['personality', '性格', profile.personality || '未记录'], ['detail', '人物说明', profile.detail || profile.description || '未记录'],
      ['relationships', '人际关系', profile.relationships || contact.relation || '未记录'],
    ].map(([key, label, value]) => ({ key, label, value, text: `${label}：${value}` }));
  },
  wechatAlbumBodyItems(body = []) {
    return Array.isArray(body) && body.length ? body.map((item, index) => {
      const label = item.part || item.name || `部位${index + 1}`;
      const value = item.description || item.detail || '未记录';
      return { key: `body-${index}`, label, value, text: `${label}：${value}` };
    }) : [{ key: 'body-empty', label: '部位描述', value: '未记录', text: '未记录' }];
  },
  wechatAlbumPromptOptions(kind = this.wechatAlbumPromptDraft?.kind || 'natural') {
    const contact = this.wechatProfileContact();
    const { state, profile } = this.wechatAlbumStateData(contact);
    return {
      identity: this.wechatAlbumIdentityItems(contact, state, profile),
      body: kind === 'custom' ? [] : this.wechatAlbumBodyItems(kind === 'dressed' ? profile.dressedProfile : profile.bodyProfile),
    };
  },
  wechatAlbumKindLabel(kind = this.wechatAlbumPromptDraft?.kind || 'natural') {
    return kind === 'custom' ? '自定义状态' : (kind === 'dressed' ? '盛装状态' : '自然状态');
  },
  wechatAlbumSelectedText() {
    const draft = this.wechatAlbumPromptDraft || { kind: 'natural', identityKeys: [], bodyKeys: [], customText: '', extraText: '' };
    const options = this.wechatAlbumPromptOptions(draft.kind);
    const identityItems = options.identity.filter((item) => draft.identityKeys.includes(item.key));
    const bodyItems = draft.kind === 'custom' ? [] : options.body.filter((item) => draft.bodyKeys.includes(item.key));
    const identityInfo = identityItems.map((item) => item.text).join('\n') || '未记录';
    const bodyText = draft.kind === 'custom' ? String(draft.customText || '').trim() : bodyItems.map((item) => item.text).join('\n');
    return { identityInfo, bodyText: bodyText || '未记录', extraText: String(draft.extraText || '').trim(), stateName: this.wechatAlbumKindLabel(draft.kind), kind: draft.kind, identityItems, bodyItems };
  },
  wechatAlbumPromptPreview() { return this.wechatAlbumPhotoPrompt(this.wechatProfileContact(), this.wechatAlbumPromptDraft?.kind || 'natural', this.wechatAlbumPromptDraft); },
  wechatAlbumSelectedCharCount() { return this.wechatAlbumPromptPreview().length; },
  wechatAlbumIdentityInfo(contact, state = {}, profile = {}) { return this.wechatAlbumIdentityItems(contact, state, profile).map((item) => item.text).join('\n'); },
  wechatAlbumBodyText(body) { return this.wechatAlbumBodyItems(body).map((item) => item.text).join('\n'); },

  wechatAlbumPhotoPrompt(contact, kind = 'natural', draft = null) {
    const ctx = this.wechatAlbumTagContext(contact, kind, draft);
    const template = window.GameModules.pictureGeneratePrompts?.drawTagPrompt || '';
    return this.renderWechatAlbumPrompt(template, ctx).slice(0, 2000);
  },

  async generateWechatAlbumSelectedPhoto() { await this.generateWechatAlbumPhotoFromSelectedPrompt(); },
  async generateWechatAlbumPhotoFromSelectedPrompt() {
    const selectedPrompt = this.wechatAlbumSelectedPrompt?.();
    const kind = selectedPrompt?.kind || this.wechatAlbumPromptDraft?.kind || 'natural';
    const prompt = this.wechatAlbumPromptEditText || selectedPrompt?.prompt || '';
    const negativePrompt = this.wechatAlbumPromptEditNegative || selectedPrompt?.negativePrompt || '';
    if (selectedPrompt) {
      const contact = this.wechatProfileContact();
      const list = this.wechatAlbumPromptList(contact).map((item) => item.id === selectedPrompt.id ? { ...item, prompt, negativePrompt } : item);
      this.wechatAlbumPrompts = { ...(this.wechatAlbumPrompts || {}), [contact.id]: list };
      await this.save?.();
    }
    await this.generateWechatAlbumPhoto(kind, { prompt, negativePrompt });
  },
  async generateWechatAlbumPhoto(kind = 'natural', promptData = null) {
    if (this.wechatAlbumGenerating) return;
    const contact = this.wechatProfileContact();
    if (!contact || contact.group) return;
    const reqId = (this.wechatAlbumRequestId || 0) + 1;
    this.wechatAlbumRequestId = reqId;
    this.wechatAlbumGenerating = true;
    this.wechatAlbumPromptOpen = false;
    try {
      await this.ensureWechatUserProfile?.(contact);
      const prompt = String(promptData?.prompt || '').trim();
      if (!prompt) throw new Error('请先选择或生成绘图提示词');
      const negativePrompt = String(promptData?.negativePrompt || '').trim() || 'bad anatomy, extra fingers, extra arms, missing fingers, low quality, blurry, worst quality, watermark, text, logo, bad hands';
      const safePrompt = window.GameModules.applyPictureGenerateSensitiveReplacements?.(prompt) || prompt;
      const safeNegativePrompt = window.GameModules.applyPictureGenerateSensitiveReplacements?.(negativePrompt) || negativePrompt;
      const drawOptions = { prompt: safePrompt.slice(0, 2000), dimension: '2:3', model: this.selectedDrawModelId?.() || 'anime', negativePrompt: safeNegativePrompt.slice(0, 2000) };
      const titleState = this.wechatAlbumKindLabel(kind);
      const tokenRecordId = window.GameModules.tokenStats?.record?.(`draw-wechat-album-${kind}`, drawOptions.prompt, { model: drawOptions.model, title: `微信相册图片生成｜${contact.name || '联系人'}｜${titleState}`, category: '图片生成', summary: '微信联系人相册全身正面照绘图请求。', kind: 'draw' });
      const result = await this.wechatDrawWithRetry(() => window.dzmm.draw.generate(drawOptions));
      window.GameModules.tokenStats?.recordResponse?.(tokenRecordId, JSON.stringify(result || {}, null, 2), result?.images || []);
      if (reqId !== this.wechatAlbumRequestId) return;
      const url = result?.images?.[0] || '';
      if (!url) throw new Error('图片生成完成但没有返回图片');
      const list = this.wechatAlbumPhotoList();
      this.wechatAlbumPhotos = { ...(this.wechatAlbumPhotos || {}), [contact.id]: [{ url, kind, taskId: result.taskId || '', real: false, createdAt: new Date().toISOString() }, ...list] };
      await this.save?.();
    } catch (err) {
      if (reqId !== this.wechatAlbumRequestId) return;
      console.error('[微信相册] 图片生成失败:', err.code, err.message, err.stack);
      this.wechatError = err?.message || '照片生成失败，请稍后重试。';
    } finally {
      if (reqId === this.wechatAlbumRequestId) this.wechatAlbumGenerating = false;
    }
  },

  async wechatDrawWithRetry(fn, max = 3) {
    for (let i = 0; i < max; i += 1) {
      try { return await fn(); } catch (err) {
        const retryable = window.dzmm?.errors?.isDzmmError?.(err) && err.retryable;
        if (!retryable || i === max - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (2 ** i)));
      }
    }
    return null;
  },

  async markWechatAlbumPhotoReal(index = 0) {
    const contact = this.wechatProfileContact();
    const list = this.wechatAlbumPhotoList();
    if (!contact || !list[index]) return;
    this.wechatAlbumPhotos = { ...(this.wechatAlbumPhotos || {}), [contact.id]: list.map((photo, i) => i === index ? { ...photo, real: true } : photo) };
    await this.save?.();
    await this.autoCaptureWechatAvatar?.(index);
  },
};


;// ---- wechat-change-panel-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.wechatChangePanelActions = {
  toggleWechatChangePanel(msg) {
    if (!msg) return;
    msg.changeReasonsOpen = !msg.changeReasonsOpen;
  },

  wechatHasChangeReasons(msg) {
    return this.wechatChangeGroups(msg).some((group) => group.items.length);
  },

  wechatChangeGroups(msg = {}) {
    const metrics = msg.metricUpdates || {};
    return [
      { title: '情绪变化', items: this.wechatMetricReasonItems(metrics.emotions, 'emotions', msg) },
      { title: '感觉变化', items: this.wechatMetricReasonItems(metrics.playerFeelings, 'playerFeelings', msg) },
      { title: '穿着变化', items: this.wechatWearingReasonItems(msg.lexiconUpdates) },
    ].filter((group) => group.items.length);
  },

  wechatMetricState(msg = {}) {
    const id = msg.characterId || '';
    return this.rpgStates?.[id] || null;
  },

  usefulMetricText(text = '', key = '') {
    const value = String(text || '').trim();
    return value && !/缺少AI生成/.test(value);
  },

  metricProfileItem(state, group, key) {
    const list = group === 'emotions' ? state?.profile?.initialMetrics?.emotions : state?.profile?.initialMetrics?.playerFeelings;
    return (Array.isArray(list) ? list : []).find((item) => item?.key === key) || null;
  },

  wechatMetricReasonItems(list = [], group = 'emotions', msg = {}) {
    const state = this.wechatMetricState(msg);
    const valueMap = group === 'emotions' ? state?.metrics?.emotions : state?.metrics?.playerFeelings;
    const notePrefix = group === 'emotions' ? 'emotion' : 'player';
    return (Array.isArray(list) ? list : []).map((item) => {
      const key = item?.key || '未命名';
      const delta = Number(item?.delta) || 0;
      const nextValue = Number.isFinite(Number(valueMap?.[key])) ? window.GameModules.metrics.clamp(valueMap[key]) : null;
      const prevValue = nextValue === null ? null : window.GameModules.metrics.clamp(nextValue - delta);
      const note = state?.metrics?.notes?.[`${notePrefix}:${key}`] || {};
      const profile = this.metricProfileItem(state, group, key) || {};
      const status = [item?.status, note.status, profile.status].find((text) => this.usefulMetricText(text, key)) || '';
      const reason = [item?.reason, note.reason, profile.reason].find((text) => this.usefulMetricText(text, key)) || '';
      const sign = delta > 0 ? `+${delta}` : String(delta);
      const formula = nextValue === null ? (delta ? sign : '') : `${prevValue}${sign}=${nextValue}`;
      return { name: key, summary: [formula, status].filter(Boolean).join('｜'), reason };
    }).filter((item) => item.reason || item.summary);
  },

  wechatWearingReasonItems(list = []) {
    return (Array.isArray(list) ? list : []).filter((item) => item?.kind === '穿着').map((item) => {
      const value = item?.value && typeof item.value === 'object' ? item.value : {};
      return {
        name: item?.name || value.name || value.slot || '穿着',
        summary: [item?.slot || value.slot, item?.summary || item?.description || value.description].filter(Boolean).join('｜'),
        reason: item?.reason || value.reason || '',
      };
    }).filter((item) => item.reason || item.summary);
  },
};


;// ---- player-wechat-setup.js ----
window.GameModules = window.GameModules || {};

(function attachPlayerWechatSetup() {
  const actions = window.GameModules.playerSetupActions;
  if (!actions) return;
  const originalComplete = actions.completePlayerSetup;
  const originalPrompt = actions.enrichPlayerProfile;

  actions.enrichPlayerProfile = async function enrichPlayerProfileWithRelations(base) {
    const relationHint = '关系整理规则：必须从玩家填写的全量上下文综合整理微信联系人，包括relationships、livingStatus、parents、notes等字段；只要某个现实人物或关系角色能从输入确认存在，即使不在relationships字段、即使没有姓名，也要整理为“关系：姓名”并由AI补正式姓名；不要照抄长描述，不要擅自新增输入中不存在的人；若同类关系有多个独立个体，例如双胞胎之一/之二、两名妹妹、妹妹A/妹妹B，必须保留相同数量的独立关系条目，不能合并成一个人。';
    const data = await originalPrompt.call(this, { ...base, relationshipRule: relationHint });
    return data;
  };

  actions.completePlayerSetup = async function completePlayerSetupWithWechat(options = {}) {
    const result = await originalComplete.call(this, options);
    if (!this.phoneSetupDone) return result;
    await this.syncRelationshipWechatUsers?.({ generateProfile: false, save: false });
    await this.save?.();
    return result;
  };
})();
