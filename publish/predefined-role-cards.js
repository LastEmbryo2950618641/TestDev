window.GameModules = window.GameModules || {};

window.GameModules.predefinedRoleCards = {
  keys: ['liu-you', 'liu-siyao', 'liu-siqi', 'liu-siyi'],
  cache: null,

  async loadAll() {
    if (this.cache) return this.cache;
    const source = window.GameModules.predefinedRoleCardData || {};
    const clone = (card) => window.GameModules.predefinedRoleCardActions?.cloneRoleCardForEditing?.(card) || JSON.parse(JSON.stringify(card));
    const cards = this.keys.map((key) => source[key]).filter((card) => card?.name).map(clone);
    if (cards.length !== this.keys.length) {
      console.warn('[预定义角色卡] 本地脚本数据缺失:', this.keys.filter((key) => !source[key]).join('、'));
    }
    this.cache = cards;
    return cards;
  },

  byName(cards, name) {
    return (cards || this.cache || []).find((card) => card.name === name) || null;
  },

  identitySummary(card) {
    if (!card) return '未选择角色卡';
    const factions = (card.factions || []).map((x) => x.name || [x.faction, x.role].filter(Boolean).join(' / ')).filter(Boolean).join('；') || '未记录';
    const forces = (card.force_positions || []).map((x) => x.name || [x.force, x.position].filter(Boolean).join(' / ')).filter(Boolean).join('；') || '未记录';
    return [`姓名：${card.name}`, `性别：${card.gender || '未记录'}`, `年龄：${card.age || '未记录'}`, `生日：${card.birthday || '未记录'}`, `身份：${card.role || '未记录'}`, `职业：${card.job || '未记录'}`, `社群角色：${factions}`, `势力地位：${forces}`, `关系：${card.relationships || '未记录'}`].join('\n');
  },

  detailSummary(card) {
    if (!card) return '';
    const emotions = (card.initialMetrics?.emotions || []).map((x) => `${x.key}${x.value}`).join('、') || '无';
    const feelings = (card.initialMetrics?.playerFeelings || []).map((x) => `${x.key}${x.value}`).join('、') || '无';
    return [`人物说明：${card.detail || '无'}`, `外貌：${card.appearance || '无'}`, `喜好：${card.preferences || '无'}`, `性格：${card.personality || '无'}`, `技能：${(card.skills || []).map((x) => x.name).join('、') || '无'}`, `物品：${(card.items || []).map((x) => x.name).join('、') || '无'}`, `情绪数值：${emotions}`, `对玩家感情：${feelings}`].join('\n');
  },

  playerProfileFromCard(card, fallback = {}) {
    if (!card) return fallback;
    const aiParts = window.Alpine?.store?.('game')?.normalizePlayerCardAiParts?.(fallback.playerCardAiParts) || { part2: false, part5: false, part6: false };
    return {
      ...fallback,
      playerCardAiParts: aiParts,
      name: card.name || fallback.name || '', gender: card.gender || fallback.gender || '', birthday: card.birthday || fallback.birthday || '', age: card.age || fallback.age || '',
      city: fallback.city || '', dailyRole: card.role || fallback.dailyRole || '', workplace: card.workplace || fallback.workplace || '', position: card.position || fallback.position || '',
      livingStatus: fallback.livingStatus || '', parents: fallback.parents || '', relationships: card.relationships || fallback.relationships || '', notes: fallback.notes || card.detail || '', initializedAt: fallback.initializedAt || new Date().toISOString(),
    };
  },

  relationshipText(cards, roles = {}) {
    return (cards || []).filter(Boolean).map((card) => `${roles[card.name] || card.role || '关系'}：${card.name}`).join('；');
  },

  async createState(card, store, idOverride = '') {
    if (!card || !window.GameModules.sqliteSave.db) return null;
    const id = idOverride || card.id || card.name;
    const existing = window.GameModules.sqliteSave.getCharacterState(id);
    let profile = { ...card, id, roleCard: true, roleCardSource: card.roleCardSource || 'predefined-edited', roleCardUpdatedAt: card.roleCardUpdatedAt || existing?.profile?.roleCardUpdatedAt || new Date().toISOString() };
    if (window.GameModules.characterProfile?.hasRequiredInitialMetrics?.(existing?.profile?.initialMetrics)) profile.initialMetrics = existing.profile.initialMetrics;
    const schema = await window.GameModules.rpgState.ensureSchema(profile.work || '现实世界');
    const state = existing || window.GameModules.rpgState.createCharacterState(profile, schema, store);
    state.id = profile.id;
    state.name = profile.name;
    state.worldTag = schema.worldTag;
    state.schema = schema;
    state.profile = profile;
    state.note = profile.detail || state.note || '';
    window.GameModules.rpgState.upgradeCharacterState(state, schema);
    if (profile.isPlayer) {
      state.values.status_tags = ['玩家本人', '手机主人', profile.work, profile.role];
      state.profile.isPlayer = true;
    }
    window.GameModules.rpgProfileMetrics?.rebase?.(state, profile, existing?.profile || {});
    await window.GameModules.rpgLexicon.syncState(state);
    await window.GameModules.sqliteSave.saveCharacterState(state);
    store.rpgStates = { ...(store.rpgStates || {}), [state.id]: state };
    return state;
  },

  scheduleLocationName(state = {}, store = {}) {
    const raw = state?.values?.current_location;
    const name = typeof raw === 'string' ? raw : raw?.name;
    const clean = String(name || '').trim();
    if (clean && !/^当前位置未知|未知地点|现实地点|当前位置$/u.test(clean)) return clean;
    return String(store?.realWorldLocationName || store?.realWorldMap?.current || '当前位置未知').trim() || '当前位置未知';
  },

  scheduleAvailability(locationName = '') {
    return /^当前位置未知|未知地点|现实地点|当前位置$/u.test(String(locationName || '').trim()) ? '未知' : '在场';
  },

  scheduleUpdatedAt(store = {}) {
    return [store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || new Date().toISOString();
  },

  defaultScheduleAction(state = {}) {
    return state?.id === 'player-self' ? '由玩家当前行动决定' : '按角色日常安排活动';
  },

  buildInitialScheduleEntry(state = {}, store = {}) {
    const location = this.scheduleLocationName(state, store);
    return {
      characterId: state.id || state.name || '',
      characterName: state.name || state.profile?.name || state.id || '',
      currentLocation: location,
      currentAction: this.defaultScheduleAction(state),
      availability: this.scheduleAvailability(location),
      confidence: this.scheduleAvailability(location) === '未知' ? '默认' : '确认',
      source: '角色卡初始化',
      stability: '默认稳定',
      updatedAt: this.scheduleUpdatedAt(store),
      reason: '进入游戏时根据角色卡当前所在位置建立默认日程；后续仅由结算或明确事件更新。',
    };
  },

  ensureInitialScheduleForState(store, state) {
    if (!store || !state?.id) return null;
    store.characterSchedules = store.characterSchedules && typeof store.characterSchedules === 'object' ? store.characterSchedules : {};
    const existing = store.characterSchedules[state.id];
    if (existing && existing.source !== '角色卡初始化') return existing;
    if (existing && existing.stability && existing.stability !== '默认稳定') return existing;
    const entry = this.buildInitialScheduleEntry(state, store);
    store.characterSchedules[state.id] = entry;
    return entry;
  },

  ensureInitialSchedules(store, states = []) {
    return (states || []).map((state) => this.ensureInitialScheduleForState(store, state)).filter(Boolean);
  },

  async ensurePlayerState(store) {
    const cards = store?.roleCardSetup?.cards?.length ? store.roleCardSetup.cards : await this.loadAll();
    const name = store.roleCardSetup?.selectedPlayerName || '刘悠';
    const card = this.byName(cards, name);
    if (!card) return null;
    return this.createState({ ...card, id: 'player-self', isPlayer: true }, store, 'player-self');
  },

  async preloadRelationshipStates(store) {
    return this.saveSelectedRelationshipStates(store);
  },

  async saveSelectedRoleCardStates(store) {
    if (!store?.roleCardSetup?.usePredefinedPlayerCard) return [];
    const [player, relations] = await Promise.all([
      this.ensurePlayerState(store),
      this.saveSelectedRelationshipStates(store),
    ]);
    const states = [player, ...relations].filter(Boolean);
    this.ensureInitialSchedules(store, states);
    return states;
  },

  async saveSelectedRelationshipStates(store) {
    const cards = store?.roleCardSetup?.cards?.length ? store.roleCardSetup.cards : await this.loadAll();
    const names = store.roleCardSetup?.selectedRelationNames?.length ? store.roleCardSetup.selectedRelationNames : ['刘思瑶', '刘思琪', '刘思怡'];
    const tasks = names.map((name) => {
      const card = this.byName(cards, name);
      return card ? this.createState(card, store, card.id || name) : null;
    }).filter(Boolean);
    const loaded = await Promise.all(tasks);
    return loaded.filter(Boolean);
  },
};

window.GameModules.predefinedRoleCardActions = {
  async initPredefinedRoleCards() {
    const cards = await window.GameModules.predefinedRoleCards.loadAll();
    this.roleCardSetup.cards = cards;
    this.roleCardSetup.loaded = true;
    if (!this.roleCardSetup.selectedPlayerName) this.roleCardSetup.selectedPlayerName = cards.find((x) => x.isPlayer)?.name || '刘悠';
    if (!this.roleCardSetup.selectedRelationNames.length) this.roleCardSetup.selectedRelationNames = cards.filter((x) => !x.isPlayer).map((x) => x.name);
    this.roleCardSetup.relationRoles = this.roleCardSetup.relationRoles || {};
    this.roleCardSetup.selectedRelationNames.forEach((name) => {
      const card = window.GameModules.predefinedRoleCards.byName(cards, name);
      if (card && !this.roleCardSetup.relationRoles[name]) this.roleCardSetup.relationRoles[name] = card.role || '关系';
    });
    this.syncRelationCardGenderFilter();
    if (!this.phoneSetupDone && this.roleCardSetup.usePredefinedPlayerCard) {
      this.applySelectedPlayerRoleCard();
      this.applySelectedRelationshipRoleCards();
    }
  },

  selectedPlayerRoleCard() { return window.GameModules.predefinedRoleCards.byName(this.roleCardSetup.cards, this.roleCardSetup.selectedPlayerName); },
  selectedRelationRoleCards() { return (this.roleCardSetup.selectedRelationNames || []).map((name) => window.GameModules.predefinedRoleCards.byName(this.roleCardSetup.cards, name)).filter(Boolean); },
  filteredRelationRoleCards() {
    const gender = this.roleCardSetup.gender || '';
    return (this.roleCardSetup.cards || []).filter((card) => !card.isPlayer && (!gender || card.gender === gender));
  },
  syncRelationCardGenderFilter() {
    const list = this.filteredRelationRoleCards();
    if (!list.some((card) => card.name === this.roleCardSetup.selectedRelationCardName)) this.roleCardSetup.selectedRelationCardName = list[0]?.name || '';
  },
  roleCardIdentitySummary(card) { return window.GameModules.predefinedRoleCards.identitySummary(card); },
  roleCardDetailSummary(card) { return window.GameModules.predefinedRoleCards.detailSummary(card); },

  selectPlayerRoleCard(name) {
    this.roleCardSetup.selectedPlayerName = name;
    this.applySelectedPlayerRoleCard();
  },

  applySelectedPlayerRoleCard() {
    const card = this.selectedPlayerRoleCard?.();
    if (!card) return;
    this.playerProfile = window.GameModules.predefinedRoleCards.playerProfileFromCard(card, this.playerProfile || {});
    this.applySelectedRelationshipRoleCards();
  },

  applySelectedRelationshipRoleCards() {
    const cards = this.selectedRelationRoleCards?.() || [];
    const existing = this.normalizeRelationshipEntries?.(this.playerProfile?.relationshipEntries, this.playerProfile?.relationships) || [];
    const existingByName = new Map(existing.filter((entry) => entry.name).map((entry) => [entry.name, entry]));
    const cardEntries = cards.map((card) => {
      const old = existingByName.get(card.name) || {};
      return {
        relation: old.relation || this.roleCardSetup.relationRoles?.[card.name] || card.role || '关系联系人',
        name: card.name,
        detail: old.detail || card.detail || card.personality || '',
      };
    });
    const merged = [...cardEntries, ...existing.filter((entry) => !cardEntries.some((item) => item.name === entry.name))];
    if (merged.length) {
      this.playerProfile.relationshipEntries = merged;
      this.playerProfile.relationships = this.relationshipEntriesText?.(merged) || window.GameModules.predefinedRoleCards.relationshipText(cards, this.roleCardSetup.relationRoles || {});
    }
  },

  relationTypeLabel() {
    return this.roleCardSetup.relationType === '自定义' ? (this.roleCardSetup.customRelation || '自定义关系') : this.roleCardSetup.relationType;
  },

  addSetupRelationshipCard() {
    const name = this.roleCardSetup.selectedRelationCardName;
    if (!name || this.roleCardSetup.selectedRelationNames.includes(name)) return;
    this.roleCardSetup.relationRoles = { ...(this.roleCardSetup.relationRoles || {}), [name]: this.relationTypeLabel() };
    this.roleCardSetup.selectedRelationNames = [...this.roleCardSetup.selectedRelationNames, name];
    this.applySelectedRelationshipRoleCards();
  },

  removeSetupRelationshipCard(name) {
    this.roleCardSetup.selectedRelationNames = this.roleCardSetup.selectedRelationNames.filter((item) => item !== name);
    this.applySelectedRelationshipRoleCards();
  },
};
