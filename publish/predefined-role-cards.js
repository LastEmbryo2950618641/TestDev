window.GameModules = window.GameModules || {};

window.GameModules.predefinedRoleCards = {
  keys: ['liu-you', 'liu-siyao', 'liu-siqi'],
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
    const forces = (card.forcePositions || card.force_positions || []).map((x) => x.name || [x.force, x.position].filter(Boolean).join(' / ')).filter(Boolean).join('；') || '未记录';
    return [`姓名：${card.name}`, `性别：${card.gender || '未记录'}`, `年龄：${card.age || '未记录'}`, `生日：${card.birthday || '未记录'}`, `身份：${card.role || '未记录'}`, `职业：${card.job || '未记录'}`, `社群角色：${factions}`, `势力地位：${forces}`, `关系：${card.relationships || '未记录'}`].join('\n');
  },

  detailSummary(card) {
    if (!card) return '';
    const emotions = (card.initialMetrics?.emotions || []).map((x) => `${x.key}${x.value}`).join('、') || '无';
    const feelings = (card.initialMetrics?.playerFeelings || []).map((x) => `${x.key}${x.value}`).join('、') || '无';
    return [`人物说明：${card.detail || '无'}`, `外貌：${card.appearance || '无'}`, `性格：${card.personality || '无'}`, `技能：${(card.skills || []).map((x) => x.name).join('、') || '无'}`, `装备：${(card.equipment || []).map((x) => x.name).join('、') || '无'}`, `物品：${(card.items || []).map((x) => x.name).join('、') || '无'}`, `情绪数值：${emotions}`, `对玩家感情：${feelings}`].join('\n');
  },

  playerProfileFromCard(card, fallback = {}) {
    if (!card) return fallback;
    return {
      ...fallback,
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
    const profile = { ...card, id: idOverride || card.id || card.name, roleCard: true, roleCardSource: card.roleCardSource || 'predefined-edited', roleCardUpdatedAt: new Date().toISOString() };
    const schema = await window.GameModules.rpgState.ensureSchema(profile.work || '现实世界');
    const existing = window.GameModules.sqliteSave.getCharacterState(profile.id);
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

  async ensurePlayerState(store) {
    const cards = await this.loadAll();
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
    const loaded = [];
    const player = await this.ensurePlayerState(store);
    if (player) loaded.push(player);
    loaded.push(...await this.saveSelectedRelationshipStates(store));
    return loaded;
  },

  async saveSelectedRelationshipStates(store) {
    const cards = await this.loadAll();
    const names = store.roleCardSetup?.selectedRelationNames || ['刘思瑶', '刘思琪'];
    const loaded = [];
    for (const name of names) {
      const card = this.byName(cards, name);
      if (!card) continue;
      const state = await this.createState(card, store, card.id || name);
      if (state) loaded.push(state);
    }
    return loaded;
  },
};

window.GameModules.predefinedRoleCardActions = {
  async initPredefinedRoleCards() {
    const cards = await window.GameModules.predefinedRoleCards.loadAll();
    this.roleCardSetup.cards = cards;
    this.roleCardSetup.loaded = true;
    if (!this.roleCardSetup.selectedPlayerName) this.roleCardSetup.selectedPlayerName = cards.find((x) => x.isPlayer)?.name || cards[0]?.name || '';
    if (!this.roleCardSetup.selectedRelationNames.length) this.roleCardSetup.selectedRelationNames = cards.filter((x) => !x.isPlayer).map((x) => x.name);
    this.roleCardSetup.relationRoles = this.roleCardSetup.relationRoles || {};
    this.roleCardSetup.selectedRelationNames.forEach((name) => {
      const card = window.GameModules.predefinedRoleCards.byName(cards, name);
      if (card && !this.roleCardSetup.relationRoles[name]) this.roleCardSetup.relationRoles[name] = card.role || '关系';
    });
    if (!this.phoneSetupDone && this.roleCardSetup.usePredefinedPlayerCard) {
      this.applySelectedPlayerRoleCard();
      this.applySelectedRelationshipRoleCards();
    }
  },

  selectedPlayerRoleCard() { return window.GameModules.predefinedRoleCards.byName(this.roleCardSetup.cards, this.roleCardSetup.selectedPlayerName); },
  selectedRelationRoleCards() { return (this.roleCardSetup.selectedRelationNames || []).map((name) => window.GameModules.predefinedRoleCards.byName(this.roleCardSetup.cards, name)).filter(Boolean); },
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
    const text = window.GameModules.predefinedRoleCards.relationshipText(this.selectedRelationRoleCards?.() || [], this.roleCardSetup.relationRoles || {});
    if (text) this.playerProfile.relationships = text;
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
