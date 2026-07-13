window.GameModules = window.GameModules || {};

window.GameModules.predefinedRoleCards = {
  keys: ['liu-you', 'liu-siyao', 'liu-siqi', 'liu-siyi'],
  cache: null,

  cardKeyFor(card = {}) {
    if (!card) return '';
    const byId = this.keys.find((key) => {
      const src = window.GameModules.predefinedRoleCardData?.[key];
      return src && (src.id === card.id || src.name === card.name);
    });
    return byId || '';
  },

  resolveEssentialPreferenceLayers(card = {}, key = '') {
    const cardKey = key || this.cardKeyFor(card);
    const fromCard = card?.essentialPreferenceLayers;
    if (fromCard?.layer1) return fromCard;
    const fromMap = cardKey ? window.GameModules.predefinedTripletEssentialLayers?.[cardKey] : null;
    return fromMap?.layer1 ? fromMap : null;
  },

  tripletSisterKeys() {
    return ['liu-siyao', 'liu-siqi', 'liu-siyi'];
  },

  isTripletSisterKey(key = '') {
    return this.tripletSisterKeys().includes(key);
  },

  psychGroupCount() {
    const cfg = window.GameModules.playerAspirationConfig;
    return (cfg?.psychPreferenceCategories || []).reduce(
      (sum, category) => sum + (cfg?.psychCategoryGroups?.(category)?.length || 0),
      0,
    );
  },

  tripletPsychPreferencesComplete(psychPreferences = null, min = 3) {
    const cfg = window.GameModules.playerAspirationConfig;
    if (!psychPreferences?.selected || !cfg?.psychCategoryGroups) return false;
    return (cfg.psychPreferenceCategories || []).every((category) =>
      cfg.psychCategoryGroups(category).every((group) => {
        const tags = psychPreferences.selected[group.id];
        return Array.isArray(tags) && tags.length >= min;
      }),
    );
  },

  psychTagsPerGroup(layer5 = '') {
    const prefTool = window.GameModules.playerAspirationPreferenceLayers;
    const view = prefTool?.viewFromLayers?.({ layer5 });
    return (view?.psychGroups || []).map((group) => group.tags.length);
  },

  tripletPsychLayerComplete(layer5 = '', psychPreferences = null, min = 3) {
    if (this.tripletPsychPreferencesComplete(psychPreferences, min)) return true;
    const counts = this.psychTagsPerGroup(layer5);
    const expected = this.psychGroupCount();
    return expected > 0 && counts.length >= expected && counts.every((count) => count >= min);
  },

  finalizeTripletPreset(preset = {}) {
    if (!preset?.layer1) return preset;
    const tool = window.GameModules.playerAspirationPreferenceLayers;
    const psych = preset.psychPreferences;
    if (psych?.selected && tool?.formatLayer5) {
      return {
        layer1: preset.layer1,
        layer2: preset.layer2,
        layer3: preset.layer3,
        layer4: preset.layer4,
        layer5: tool.formatLayer5(psych),
        psychPreferences: psych,
      };
    }
    return preset;
  },

  applyEssentialPreferenceLayers(profile = {}, layers = null) {
    const tool = window.GameModules.playerAspirationPreferenceLayers;
    const resolved = this.finalizeTripletPreset(layers || this.resolveEssentialPreferenceLayers(profile));
    if (!tool || !resolved?.layer1) return profile;
    tool.applyToProfile(profile, resolved, { locked: true });
    if (resolved.psychPreferences?.selected) profile.psychPreferences = resolved.psychPreferences;
    return profile;
  },

  resolveAppearanceProfile(card = {}, key = '') {
    const cardKey = key || this.cardKeyFor(card);
    return cardKey ? window.GameModules.predefinedAppearanceProfiles?.[cardKey] : null;
  },

  appearanceProfileComplete(profile = {}) {
    const cfg = window.GameModules.appearanceProfileTags;
    if (!cfg) return Boolean(profile.bodyProfileMeta && profile.dressedProfileMeta);
    if (!cfg.naturalMetaComplete(profile.bodyProfileMeta)) return false;
    if (!cfg.dressedMetaComplete(profile.dressedProfileMeta)) return false;
    return cfg.bodyParts().every((part) => {
      const bp = (profile.bodyProfile || []).find((item) => item?.part === part);
      const dp = (profile.dressedProfile || []).find((item) => item?.part === part);
      return cfg.partItemComplete(bp, true) && cfg.partItemComplete(dp, true);
    });
  },

  applyAppearanceProfile(profile = {}, preset = null) {
    const cfg = window.GameModules.appearanceProfileTags;
    if (!cfg) return profile;
    const resolved = preset || this.resolveAppearanceProfile(profile);
    const stub = {
      appearance: profile.appearance,
      preferences: profile.preferences,
      detail: profile.detail,
      personality: profile.personality,
      essentialPreferenceLayers: profile.essentialPreferenceLayers,
      psychPreferences: profile.psychPreferences,
    };
    profile.bodyProfileMeta = cfg.normalizeNaturalMeta(
      { ...cfg.inferNaturalMetaFromProfile(stub), ...(resolved?.bodyProfileMeta || {}) },
      stub,
    );
    profile.dressedProfileMeta = cfg.normalizeDressedMeta(
      { ...cfg.inferDressedMetaFromPreferences(stub), ...(resolved?.dressedProfileMeta || {}) },
      stub,
    );
    const mergePartList = (field, tagMap = {}) => {
      const list = Array.isArray(profile[field]) ? profile[field] : [];
      return cfg.bodyParts().map((part, index) => {
        const existing = list.find((entry) => entry?.part === part) || {};
        const presetTags = tagMap[part];
        const tags = Array.isArray(presetTags) && presetTags.length >= 2
          ? presetTags
          : (Array.isArray(existing.tags) && existing.tags.length >= 2 ? existing.tags : (presetTags || existing.tags || []));
        return cfg.normalizePartItem({
          ...existing,
          index: index + 1,
          part,
          tags,
          description: String(existing.description || '').trim(),
        }, index + 1, part);
      });
    };
    profile.bodyProfile = mergePartList('bodyProfile', resolved?.bodyProfileTags);
    profile.dressedProfile = mergePartList('dressedProfile', resolved?.dressedProfileTags);
    return profile;
  },

  upgradeSavedProfileAppearance(profile = {}) {
    const cardKey = this.cardKeyFor(profile);
    const preset = this.resolveAppearanceProfile(profile, cardKey);
    if (!preset || this.appearanceProfileComplete(profile)) return false;
    this.applyAppearanceProfile(profile, preset);
    return true;
  },

  async upgradeAllSavedAppearanceProfiles(store) {
    const prc = this;
    const states = Object.values(store?.rpgStates || {});
    const tasks = states.map(async (state) => {
      if (!state?.profile || !prc.upgradeSavedProfileAppearance(state.profile)) return false;
      await window.GameModules.characterStateStore?.save?.(state);
      return true;
    });
    const results = await Promise.all(tasks);
    return results.filter(Boolean).length;
  },

  async loadAll() {
    if (this.cache) return this.cache;
    const source = window.GameModules.predefinedRoleCardData || {};
    const clone = (card) => window.GameModules.predefinedRoleCardActions?.cloneRoleCardForEditing?.(card) || JSON.parse(JSON.stringify(card));
    const cards = this.keys.map((key) => {
      const card = source[key];
      if (!card?.name) return null;
      const cloned = clone(card);
      const layers = this.isTripletSisterKey(key)
        ? window.GameModules.predefinedTripletEssentialLayers?.[key]
        : this.resolveEssentialPreferenceLayers(cloned, key);
      this.applyEssentialPreferenceLayers(cloned, layers);
      this.applyAppearanceProfile(cloned, window.GameModules.predefinedAppearanceProfiles?.[key]);
      this.refreshSocialFields(cloned, null);
      this.refreshDerivedIdentityFields(cloned);
      return cloned;
    }).filter(Boolean);
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
    const memberships = (card.memberships || []).map((x) => x.name || [x.orgName, x.department, x.title].filter(Boolean).join(' / ')).filter(Boolean).join('；') || '未记录';
    return [`姓名：${card.name}`, `性别：${card.gender || '未记录'}`, `年龄：${card.age || '未记录'}`, `生日：${card.birthday || '未记录'}`, `身份：${card.role || '未记录'}`, `职业：${card.job || '未记录'}`, `社群角色：${factions}`, `人事归属：${memberships}`, `关系：${card.relationships || '未记录'}`].join('\n');
  },

  detailSummary(card) {
    if (!card) return '';
    const emotions = (card.initialMetrics?.emotions || []).map((x) => `${x.key}${x.value}`).join('、') || '无';
    const feelings = (card.initialMetrics?.playerFeelings || []).map((x) => `${x.key}${x.value}`).join('、') || '无';
    return [`人物说明：${card.detail || '无'}`, `外貌：${card.appearance || '无'}`, `喜好：${card.preferences || '无'}`, `性格：${card.personality || '无'}`, `技能：${(card.skills || []).map((x) => x.name).join('、') || '无'}`, `物品：${(card.items || []).map((x) => x.name).join('、') || '无'}`, `情绪数值：${emotions}`, `对玩家感情：${feelings}`].join('\n');
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

  refreshSocialFields(profile = {}, store = null) {
    const tool = window.GameModules.characterProfile;
    if (!profile || !tool) return profile;
    try {
      const base = { ...profile };
      const nextFactions = tool.factionRoles?.(profile, base, store);
      const nextMemberships = tool.memberships?.(profile, base, store);
      if (Array.isArray(nextFactions)) profile.factions = nextFactions;
      if (Array.isArray(nextMemberships)) profile.memberships = nextMemberships;
    } catch (err) {
      console.warn('[预定义角色卡] 刷新社群角色/人事归属失败:', err?.message || err);
    }
    return profile;
  },

  refreshDerivedIdentityFields(profile = {}) {
    if (!profile) return profile;
    const factions = Array.isArray(profile.factions) ? profile.factions : [];
    const memberships = Array.isArray(profile.memberships) ? profile.memberships : [];
    const primaryFaction = factions[0] || {};
    const primaryMembership = memberships[0] || {};
    profile.faction = String(primaryFaction.faction || primaryFaction.name || '').trim().slice(0, 30);
    profile.factionRole = String(primaryFaction.role || primaryFaction.position || '').trim().slice(0, 24);
    profile.rank = String(primaryMembership.title || '').trim().slice(0, 30);
    return profile;
  },

  relationshipText(cards, roles = {}) {
    return (cards || []).filter(Boolean).map((card) => `${roles[card.name] || card.role || '关系'}：${card.name}`).join('；');
  },

  getExistingState(id = '') {
    return window.GameModules.characterStateStore?.get?.(id) || null;
  },

  async saveState(state = null) {
    return window.GameModules.characterStateStore?.save?.(state);
  },

  buildRoleCardProfile(card = {}, existing = null, id = '') {
    let profile = { ...card, id, roleCard: true, roleCardSource: card.roleCardSource || 'predefined-edited', roleCardUpdatedAt: card.roleCardUpdatedAt || existing?.profile?.roleCardUpdatedAt || new Date().toISOString() };
    if (window.GameModules.characterProfile?.hasRequiredInitialMetrics?.(existing?.profile?.initialMetrics)) profile.initialMetrics = existing.profile.initialMetrics;
    const cardKey = this.cardKeyFor(card);
    const presetLayers = this.isTripletSisterKey(cardKey)
      ? window.GameModules.predefinedTripletEssentialLayers?.[cardKey]
      : this.resolveEssentialPreferenceLayers(card, cardKey);
    const finalizedPreset = this.finalizeTripletPreset(presetLayers);
    const forceTripletLayers = this.isTripletSisterKey(cardKey) && finalizedPreset?.layer1;
    const missingLayers = finalizedPreset?.layer1 && !profile.essentialPreferenceLayers?.layer1;
    const incompletePsych = finalizedPreset?.layer1
      && !this.tripletPsychLayerComplete(profile.essentialPreferenceLayers?.layer5, profile.psychPreferences || finalizedPreset?.psychPreferences);
    if (forceTripletLayers || missingLayers || incompletePsych) {
      this.applyEssentialPreferenceLayers(profile, presetLayers);
    } else if (profile.essentialPreferenceLayers?.layer1) {
      this.applyEssentialPreferenceLayers(profile, profile.essentialPreferenceLayers);
    }
    const appearancePreset = this.resolveAppearanceProfile(profile, cardKey);
    const forceAppearance = Boolean(appearancePreset);
    const incompleteAppearance = forceAppearance && !this.appearanceProfileComplete(profile);
    if (forceAppearance || incompleteAppearance) {
      this.applyAppearanceProfile(profile, appearancePreset);
    }
    return profile;
  },

  async createState(card, store, idOverride = '') {
    if (!card || !window.GameModules.platform.storage.capabilities.isReady?.()) return null;
    const id = idOverride || card.id || card.name;
    const existing = this.getExistingState(id);
    const profile = this.buildRoleCardProfile(card, existing, id);
    this.refreshSocialFields(profile, store);
    this.refreshDerivedIdentityFields(profile);
    const schema = await window.GameModules.rpgState.ensureSchema(profile.work || window.GameModules.realWorld2026?.label || '2026 现代都市现实世界');
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
    store.initFactionSystem?.();
    window.GameModules.orgTerritory?.ensurePresetFamilyMemberships?.(store);
    await window.GameModules.rpgLexicon.syncState(state);
    await this.saveState(state);
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
    if (entry.currentLocation) {
      window.GameModules.orgTerritory?.bumpOrgExposureOnScheduleLocation?.(store, entry.currentLocation);
    }
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
