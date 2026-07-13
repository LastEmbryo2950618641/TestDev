window.GameModules = window.GameModules || {}; window.GameModules.wechatActions = {
  defaultWechatGroup() {
    return { id: 'group-main', name: '鎿嶆帶鑰呬氦娴佺兢', mark: '缇?, subtitle: '鑱婂ぉ缇?, latest: '绯荤粺锛氭柊鎵嬫満宸叉縺娲汇€?, unread: 8, group: true };
  },
  normalizeWechatContact(raw = {}) {
    const name = String(raw.name || '').trim().slice(0, 24);
    if (!name) return null;
    const relation = String(raw.relation || raw.subtitle || '鑱旂郴浜?).trim().slice(0, 30);
    const id = String(raw.id || `wx-${name}-${relation}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || `wx-${window.GameModules.rpgState.seed(`${name}-${relation}`)}`;
    const needsNameAi = raw.needsNameAi ?? (this.isWechatPlaceholderName(name) && !raw.id);
    return { id, characterId: id, name, relation, subtitle: relation, mark: String(raw.mark || name.slice(0, 1)).slice(0, 2), latest: String(raw.latest || `${relation}璧勬枡宸插悓姝ャ€俙).slice(0, 80), unread: Number(raw.unread) || 0, group: false, source: raw.source || 'manual', context: raw.context || '', needsNameAi };
  },
  isWechatPlaceholderName(name = '') {
    const text = String(name || '').trim();
    return !text || /寰呭懡鍚峾寰匒I琛ュ叏|绛夊緟AI琛ュ叏|绛夊緟ai琛ュ叏|濮撳悕寰匒I琛ュ叏/i.test(text)
      || /^(濡瑰|濮愬|鍝ュ摜|寮熷紵|鐖朵翰|姣嶄翰|鐖哥埜|濡堝|濂冲弸|鐢峰弸|濡诲瓙|涓堝か|鑱旂郴浜?$/.test(text)
      || /^(鍙岃優鑳巪涓夎優鑳巪澶氳優鑳??(濡瑰|濮愬|鍝ュ摜|寮熷紵|鍏勫紵|濮愬|鑱旂郴浜?(涔嬩竴|涔嬩簩|涔嬩笁|鍏朵竴|鍏朵簩|鍏朵笁)$/.test(text);
  },
  concreteWechatProfileName(profile, contact = {}) {
    const name = String(profile?.name || '').trim();
    if (!name || this.isWechatPlaceholderName(name) || name === contact.relation) return '';
    return name.slice(0, 24);
  },
  wechatCharacterId(contact) {
    if (!contact || contact.group) return '';
    return String(contact.characterId || contact.id || '').trim();
  },
  findWechatCharacterState(contact) {
    if (!contact || contact.group) return null;
    const save = window.GameModules.sqliteSave;
    const query = window.GameModules.characterQuery;
    const profileTool = window.GameModules.characterProfile;
    const world = this.currentWorldTag?.() || window.GameModules.realWorld2026?.label || '2026 鐜颁唬閮藉競鐜板疄涓栫晫';
    const characterId = this.wechatCharacterId(contact);
    const seen = new Set();
    const candidates = [];
    const push = (state) => {
      const id = String(state?.id || '').trim();
      if (!state?.profile || !id || seen.has(id)) return;
      seen.add(id);
      candidates.push(state);
    };
    [characterId, contact.id, contact.characterId].filter(Boolean).forEach((id) => {
      push(this.rpgStates?.[id]);
      push(save.getCharacterState?.(id));
    });
    [contact.name, this.concreteWechatProfileName(this.rpgStates?.[characterId]?.profile, contact)].filter(Boolean).forEach((name) => {
      push(query?.stateByName?.(this, name, world));
      push(query?.stateByName?.(this, name));
      push(save.getCharacterStateByName?.(name, world));
      push(save.getCharacterStateByName?.(name));
    });
    (save.listCharacterStates?.() || []).forEach((state) => {
      const profile = state?.profile || {};
      const name = String(profile.name || state?.name || '').trim();
      if (!name || name === String(this.playerProfile?.name || this.playerName || '').trim()) return;
      if (name === contact.name) push(state);
      else if (contact.relation && String(profile.role || '').trim() === String(contact.relation).trim() && profileTool.isConcreteName(name)) push(state);
    });
    const scoreState = (state) => {
      const profile = state?.profile;
      if (!profile) return -1;
      if (profileTool.isReusableRoleCard?.(profile)) return 300;
      if (profileTool.isRoleCard?.(profile)) return 200;
      if (profile.roleCard && profileTool.isConcreteName?.(profile.name)) return 50;
      return 0;
    };
    if (!candidates.length) return null;
    return [...candidates].sort((a, b) => scoreState(b) - scoreState(a))[0];
  },
  bindWechatCharacterState(state, contact = null) {
    if (!state?.profile) return state;
    const resolvedId = state.id || this.wechatCharacterId(contact) || state.profile.id;
    if (resolvedId) {
      this.rpgStates = { ...(this.rpgStates || {}), [resolvedId]: state };
      if (contact?.id) {
        let rebound = false;
        this.wechatUsers = (this.wechatUsers || []).map((item) => {
          if (item.id !== contact.id && item.characterId !== contact.characterId && item.name !== contact.name) return item;
          if (item.characterId === resolvedId) return item;
          rebound = true;
          return { ...item, characterId: resolvedId };
        });
        if (rebound) this.save?.().catch((err) => console.warn('[寰俊] 鑱旂郴浜鸿鑹茬粦瀹氫繚瀛樺け璐?', err.message));
      }
      this.syncWechatContactId(resolvedId);
      this.syncWechatContactProfileName(resolvedId, state.profile);
    }
    return state;
  },
  wechatMissingRoleCardMessage(contact = {}) {
    const name = String(contact.name || '璇ヨ仈绯讳汉').trim() || '璇ヨ仈绯讳汉';
    return `${name} 鐨勫瓨妗ｈ鑹插崱涓嶅瓨鍦ㄦ垨璧勬枡涓嶅畬鏁达紝璇峰厛鍦ㄨ鑹插崱绠＄悊涓‘璁ゅ凡鍏ュ簱銆俙;
  },
  async reuseWechatCharacterProfile(contact) {
    if (!contact || contact.group) return null;
    const profileTool = window.GameModules.characterProfile;
    const currentWorld = this.currentWorldTag?.() || window.GameModules.realWorld2026?.label || '2026 鐜颁唬閮藉競鐜板疄涓栫晫';
    const existing = this.findWechatCharacterState(contact);
    const reuseState = (state) => {
      if (!state?.profile || !profileTool.isRoleCard?.(state.profile)) return null;
      this.bindWechatCharacterState(state, contact);
      profileTool.ensureInitialMetricSources?.(state.profile, state.profile, [state.profile.detail, state.note].filter(Boolean).join('锛?), this)
        .then((profile) => {
          if (!profile || profile === state.profile) return;
          state.profile = profile;
          return window.GameModules.characterStateStore?.save?.(state);
        })
        .catch((err) => console.warn('[寰俊] 瑙掕壊鏁板€兼潵婧愯ˉ鍏ㄥけ璐?', err.code, err.message, err.stack));
      return state;
    };
    const fromExisting = reuseState(existing);
    if (fromExisting) return fromExisting;
    const characterId = this.wechatCharacterId(contact);
    const saved = profileTool.findSavedRoleCard?.({ id: characterId, name: contact.name, work: currentWorld }, '');
    return reuseState(saved);
  },
  displayWechatContact(contact) {
    if (!contact || contact.group) return contact;
    const characterId = this.wechatCharacterId(contact);
    const state = this.findWechatCharacterState(contact) || this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId);
    const name = this.concreteWechatProfileName(state?.profile, contact);
    return name ? { ...contact, characterId: state?.id || characterId, name, mark: name.slice(0, 1), avatar: contact.avatar, needsNameAi: false } : { ...contact, characterId: state?.id || characterId, avatar: contact.avatar };
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
      const state = this.findWechatCharacterState?.(item) || this.rpgStates?.[characterId] || window.GameModules.sqliteSave?.getCharacterState?.(characterId);
      const name = this.concreteWechatProfileName(state?.profile, item);
      let next = item.characterId === characterId ? item : { ...item, characterId };
      if (name && next.name !== name) next = { ...next, name, mark: name.slice(0, 1), subtitle: next.relation || next.subtitle, needsNameAi: false };
      if (next !== item) changed = true;
      return next;
    });
    return changed;
  },
  async ensureWechatUserProfile(contact, options = {}) {
    if (!contact || contact.group) return null;
    this.wechatProfileInflight = this.wechatProfileInflight || {};
    if (this.wechatProfileInflight[contact.id]) return this.wechatProfileInflight[contact.id];
    return this.wechatProfileInflight[contact.id] = this.ensureWechatUserProfileRun(contact, options).finally(() => { delete this.wechatProfileInflight[contact.id]; });
  },
  async ensureWechatUserProfileRun(contact, options = {}) {
    const reused = await this.reuseWechatCharacterProfile?.(contact);
    if (reused) return reused;
    if (!options.generateIfMissing) {
      this.wechatError = this.wechatMissingRoleCardMessage(contact);
      console.warn('[寰俊] 瀛樻。瑙掕壊鍗＄己澶?', contact?.name || contact?.id);
      return null;
    }
    const characterId = this.wechatCharacterId(contact);
    const profileTool = window.GameModules.characterProfile;
    const currentWorld = this.currentWorldTag?.() || window.GameModules.realWorld2026?.label || '2026 鐜颁唬閮藉競鐜板疄涓栫晫';
    const existing = this.findWechatCharacterState(contact);
    this.addRoleCardLoadingCard?.({ id: characterId, name: contact.name || '寰俊鑱旂郴浜?, type: '瑙掕壊鍗? });
    const existingName = existing?.profile?.name || '';
    const contactNameConcrete = profileTool.isConcreteName(contact.name);
    const existingNameConcrete = profileTool.isConcreteName(existingName);
    const needsName = contact.needsNameAi || !contactNameConcrete;
    const hint = this.wechatRelationProfileHint(contact);
    const sections = window.GameModules.promptSections;
    const player = sections.playerProfile(this);
    const relationContext = this.wechatRelationFullContext(contact, hint);
    const targetName = contactNameConcrete ? contact.name : (existingNameConcrete ? existingName : hint.placeholderName);
    const raw = { id: characterId, name: targetName, role: contact.relation || '寰俊鑱旂郴浜?, detail: relationContext, work: currentWorld, worldTag: currentWorld, isMinor: false, importance: 'support', nameRule: hint.nameRule };
    const context = await window.GameModules.renderPrompt('wechat-relation-profile', {
      鐜╁鍩虹璧勬枡鍖? player.playerBasic,
      鐜╁鐜板疄韬唤鍖? player.playerIdentity,
      鐜╁灞呬綇瀹跺涵鍖? player.playerHome,
      鐜╁浜洪檯鍏崇郴鍖? player.playerRelations,
      鐜╁澶囨敞鍖? player.playerNotes,
      寰俊鑱旂郴浜鸿祫鏂欏尯: sections.wechatContact({ ...contact, context: relationContext }, hint),
    });
    let profile;
    try {
      profile = await window.GameModules.characterProfile.ensure(raw, this, context);
    } catch (err) {
      console.warn('[寰俊] 鑱旂郴浜哄鍚嶈ˉ鍏ㄥけ璐ワ紝淇濈暀鏃ц祫鏂?', err.code, err.message, err.stack);
      this.wechatError = '鑱旂郴浜哄鍚嶈ˉ鍏ㄦ殏鏃跺け璐ワ紝璇风◢鍚庨噸璇曘€?;
      return existing || null;
    }
    if (!window.GameModules.characterProfile.isConcreteName(profile.name)) {
      this.wechatError = '鑱旂郴浜哄鍚嶄粛鏈ˉ鍏紝璇风◢鍚庨噸璇曘€?;
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
    const relation = String(contact?.relation || contact?.name || '鑱旂郴浜?);
    const nameRule = `蹇呴』鐢盇I鏍规嵁涓栫晫瑙傘€佸湴鍖烘枃鍖栥€佸搴埗搴︺€佺帺瀹跺鍚嶃€佺帺瀹舵€у埆涓庘€?{relation}鈥濊繖娈电ぞ浼氬叧绯绘帹鐞嗘寮忓鍚嶅拰鎬у埆锛涗笉瑕佺‖濂楀悓濮撹鍒欙紝姣嶄翰/閰嶅伓/缁т翰/鍏讳翰绛夊彲鑳戒笉鍚屽锛涗笉瑕佺洿鎺ョ敤鍏崇郴绉拌皳褰撳鍚嶃€俙;
    return { nameRule, placeholderName: `${relation}寰呭懡鍚峘, detail: `鐜╁鐨?{relation}锛岄渶瑕佹寜涓栫晫瑙傘€佹枃鍖栦範淇楀拰绀句細鍏崇郴琛ュ叏濮撳悕銆佹€у埆涓庤祫鏂欍€俙 };
  },
  wechatRelationFullContext(contact, hint) {
    const p = this.playerProfile || {};
    return [
      `褰撳墠鑱旂郴浜猴細${contact?.name || ''}`,
      `褰撳墠鍏崇郴锛?{contact?.relation || ''}`,
      `鍏崇郴鏉＄洰锛?{contact?.context || contact?.latest || hint.detail}`,
      `鐜╁瀹屾暣浜洪檯鍏崇郴锛?{p.relationships || '鏈～鍐?}`,
      `鐜╁灞呬綇鐘舵€侊細${p.refinedLivingStatus || p.livingStatus || '鏈～鍐?}`,
      `鐜╁琛ュ厖璁惧畾/澶囨敞锛?{p.notes || '鏃?}`,
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
      try { await this.ensureWechatUserProfile(stored, { generateIfMissing: true }); }
      catch (err) { console.warn('[寰俊] 鑱旂郴浜鸿祫鏂欑敓鎴愬け璐?', err.code, err.message, err.stack); }
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
    const contact = await this.addWechatUser({ name: this.wechatAddName, relation: this.wechatAddRelation || '寰俊鑱旂郴浜?, source: 'manual' }, { generateProfile: true });
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
    const rel = String(relation || '').trim().slice(0, 18) || '鍏崇郴鑱旂郴浜?;
    const context = rawText || text;
    const explicitId = context.match(/(?:瑙掕壊ID|瑙掕壊id|characterId|id)\s*[锛?=]\s*([A-Za-z0-9_-]{2,40})/)?.[1] || '';
    const known = this.roleCardSetup?.usePredefinedPlayerCard ? this.predefinedRelationshipCards().filter((card) => context.includes(card.name)) : [];
    if (known.length) return known.map((card) => ({ id: card.id, characterId: card.id, name: card.name, relation: relation || card.role || '鍏崇郴鑱旂郴浜?, latest: `${relation || card.role || card.name}璧勬枡宸蹭粠鐜╁浜洪檯鍏崇郴鍚屾銆俙, source: 'relationships', context, needsNameAi: false }));
    const clean = text.replace(/(?:瑙掕壊ID|瑙掕壊id|characterId|id)\s*[锛?=]\s*[A-Za-z0-9_-]{2,40}/g, '').trim();
    const named = [...clean.matchAll(/(?:濮撳悕|鍚嶅瓧|鍚嶅彨|鍙綔|鍙仛|鍙珅鍚嶄负)\s*([\u4e00-\u9fa5A-Za-z0-9_路]{2,24})/g)].map((match) => match[1]);
    const splitParts = clean.split(/[銆侊紝,\/|鍜屼笌鍙奭+/).map((item) => item.trim()).filter(Boolean);
    const directNames = restText ? splitParts : [];
    const explicitNames = (directNames.length ? directNames : splitParts)
      .map((item) => item.replace(/^.*?(?:濡瑰|濮愬|鍝ュ摜|寮熷紵|鍏勫紵|濮愬|鑱旂郴浜??(?:涔嬩竴|涔嬩簩|涔嬩笁|鍏朵竴|鍏朵簩|鍏朵笁)?[锛?]?\s*/, '').trim())
      .filter((name) => /^[\u4e00-\u9fa5]{2,4}(?:[路鈥[\u4e00-\u9fa5]{1,4})?$/.test(name))
      .filter((name) => name !== selfName && !this.isWechatPlaceholderName(name));
    const parts = named.length ? named : (explicitNames.length ? explicitNames : splitParts);
    const names = parts.map((x) => String(x || '').replace(/[锛?].*?[锛?]/g, '').replace(/[锛屻€傦紱;銆?.].*$/, '').trim().slice(0, 24)).filter((x) => x && x !== selfName && x !== rel && !this.isWechatPlaceholderName(x));
    const list = names.length ? names : [rel || `鑱旂郴浜?{index + 1}`];
    return list.filter(Boolean).map((name, subIndex) => {
      const needsNameAi = !names.length;
      const id = explicitId && list.length === 1 ? explicitId : `rel-ai-${window.GameModules.rpgState.seed(`${rel}-${name}-${index}-${subIndex}`)}`;
      return { id, characterId: id, name: name.slice(0, 24), relation: rel, latest: `${rel || name}璧勬枡宸蹭粠鐜╁浜洪檯鍏崇郴鍚屾銆俙, source: explicitId ? 'relationships' : 'relationships-ai', context, needsNameAi };
    });
  },
  inferWechatUsersFromRelationships(text = '') {
    const source = String(text || '').trim();
    if (!source) return [];
    const selfName = String(this.playerProfile?.name || this.playerName || '').trim();
    return source.split(/[锛?\n]+/).map((part) => part.trim()).filter(Boolean).flatMap((part, index) => {
      const pair = part.split(/[锛?]/);
      const relation = (pair[0] || '').trim().slice(0, 18);
      const rest = pair.slice(1).join('锛?).trim();
      return this.relationshipContactsFromPart(part, relation, rest, index, selfName);
    }).filter((user) => user && user.name && user.name !== selfName).slice(0, 20);
  },
  inferWechatUsersFromRelationshipEntries() {
    const entries = this.normalizeRelationshipEntries ? this.normalizeRelationshipEntries(this.playerProfile?.relationshipEntries, this.playerProfile?.relationships) : [];
    const selfName = String(this.playerProfile?.name || this.playerName || '').trim();
    return entries.filter((entry) => entry.relation || entry.name).flatMap((entry, index) => {
      const relation = String(entry.relation || '鍏崇郴鑱旂郴浜?).trim().slice(0, 18);
      const name = String(entry.name || relation).trim().slice(0, 24);
      if (!name || name === selfName) return [];
      const needsNameAi = !entry.name || this.isWechatPlaceholderName(name);
      const context = [`鍏崇郴鍚嶏細${relation}`, `濮撳悕锛?{entry.name || '鏈～鍐?}`, `璁惧畾锛?{entry.detail || '鏃?}`].join('\n');
      const id = `rel-ai-${window.GameModules.rpgState.seed(`${relation}-${name}-${index}`)}`;
      return [{ id, characterId: id, name, relation, latest: `${relation}璧勬枡宸蹭粠鐜╁浜洪檯鍏崇郴鍚屾銆俙, source: 'relationships-structured', context, needsNameAi }];
    });
  },

  inferWechatUsersFromProfile() {
    const structured = this.inferWechatUsersFromRelationshipEntries();
    return structured.length ? structured : this.inferWechatUsersFromRelationships(this.playerProfile?.relationships || '');
  },

  selectedPredefinedWechatUsers() {
    return this.predefinedRelationshipCards().map((card) => ({ id: card.id, characterId: card.id, name: card.name, relation: this.roleCardSetup?.relationRoles?.[card.name] || card.role || '鍏崇郴鑱旂郴浜?, latest: `${card.role || card.name}璧勬枡宸蹭粠棰勫畾涔夎鑹插崱鍚屾銆俙, source: 'predefined-role-card', context: card.detail || card.relationships || '', needsNameAi: false }));
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
