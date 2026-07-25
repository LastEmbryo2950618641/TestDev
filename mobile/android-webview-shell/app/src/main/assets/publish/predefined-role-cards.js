window.GameModules = window.GameModules || {};

window.GameModules.predefinedRoleCards = {
  cache: null,

  roleProfile(record = {}) {
    return record?.profile && typeof record.profile === 'object' ? record.profile : record;
  },

  roleCardId(card = {}) {
    return String(card?.id || card?.name || '').trim();
  },

  uniqueCards(cards = []) {
    const seen = new Set();
    return (cards || []).filter((card) => {
      const id = this.roleCardId(card);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  },

  cardKeyFor(card = {}) {
    if (!card) return '';
    const cardId = this.roleCardId(card);
    const byId = this.loadedKeys().find((key) => {
      const src = this.roleProfile(window.GameModules.predefinedRoleCardData?.[key]);
      return src && (this.roleCardId(src) === cardId || src.name === card.name);
    });
    return byId || '';
  },

  loadedKeys() {
    return Object.keys(window.GameModules.predefinedRoleCardData || {});
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
    const cards = Object.keys(source).map((key) => {
      const card = this.roleProfile(source[key]);
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
    this.cache = this.uniqueCards(cards);
    return this.cache;
  },

  byName(cards, name) {
    return (cards || this.cache || []).find((card) => card.name === name) || null;
  },

  byId(cards, id) {
    const target = String(id || '').trim();
    return (cards || this.cache || []).find((card) => this.roleCardId(card) === target) || null;
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
    const profile = this.roleProfile(card);
    return {
      ...fallback,
      name: profile.name || fallback.name || '', gender: profile.gender || fallback.gender || '', birthday: profile.birthday || fallback.birthday || '', age: profile.age || fallback.age || '',
      city: profile.city || profile.refinedCity || '', refinedCity: profile.refinedCity || profile.city || '', currentLocation: profile.currentLocation || '',
      dailyRole: profile.role || profile.dailyRole || fallback.dailyRole || '', refinedRole: profile.refinedRole || profile.role || profile.dailyRole || fallback.refinedRole || '',
      workplace: profile.workplace || fallback.workplace || '', position: profile.position || fallback.position || '',
      livingStatus: profile.livingStatus || '', refinedLivingStatus: profile.refinedLivingStatus || profile.livingStatus || '',
      parents: profile.parents || '', parentStatus: profile.parentStatus || profile.parents || '', parentDeathCause: profile.parentDeathCause || '',
      appearance: profile.appearance ?? '', preferences: profile.preferences ?? '', personality: profile.personality ?? '',
      relationships: profile.relationships || fallback.relationships || '', notes: profile.notes || profile.detail || '', worldbuildingNote: profile.worldbuildingNote || '',
      initializedAt: fallback.initializedAt || new Date().toISOString(),
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

  getExistingState(id = '', store = null) {
    return window.GameModules.characterStateStore?.get?.(id, store) || null;
  },

  async saveState(state = null, store = null) {
    return window.GameModules.characterStateStore?.save?.(state, store);
  },

  async ensureStorageReady(store = {}) {
    if (window.GameModules.platform.storage.capabilities.isReady?.()) return true;
    const slot = store.selectedSlot || window.GameModules.platform.storage.backend?.currentSlot?.() || 'slot-1';
    await window.GameModules.storage?.open?.(slot, { deferPersist: true });
    return Boolean(window.GameModules.platform.storage.capabilities.isReady?.());
  },

  buildRoleCardProfile(card = {}, existing = null, id = '') {
    let profile = { ...card, id, roleCard: true, roleCardSource: card.roleCardSource || 'predefined-edited', roleCardUpdatedAt: card.roleCardUpdatedAt || existing?.profile?.roleCardUpdatedAt || new Date().toISOString() };
    if (window.GameModules.characterProfile?.hasRequiredInitialMetrics?.(existing?.profile?.initialMetrics)) profile.initialMetrics = existing.profile.initialMetrics;
    // Preserve runtime location chain written by map/surround-unlock; predefined cards usually omit it.
    const existingLocation = String(existing?.profile?.currentLocation || existing?.values?.current_location?.currentLocation || '').trim();
    if (existingLocation && !String(profile.currentLocation || '').trim()) profile.currentLocation = existingLocation;
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
    if (!card) return null;
    const ready = await this.ensureStorageReady(store);
    if (!ready) throw new Error('角色卡存储未就绪，无法创建正式角色状态');
    const id = idOverride || card.id || card.name;
    const storeApi = window.GameModules.characterStateStore;
    const existing = this.getExistingState(id, store);
    const liveLocation = String(
      store?.rpgStates?.[id]?.profile?.currentLocation
      || store?.appearingLocationById?.[id]
      || store?.characterSchedules?.[id]?.profileCurrentLocation
      || '',
    ).trim();
    const profile = this.buildRoleCardProfile(card, existing, id);
    if (liveLocation && !String(profile.currentLocation || '').trim()) profile.currentLocation = liveLocation;
    this.refreshSocialFields(profile, store);
    this.refreshDerivedIdentityFields(profile);
    const schema = await window.GameModules.rpgState.ensureSchema(profile.work || window.GameModules.realWorld2026?.label || '2026 现代都市现实世界');
    // Reuse the existing live object when present — never orphan rpgStates[id] with a new reference.
    const state = existing || window.GameModules.rpgState.createCharacterState(profile, schema, store);
    state.id = profile.id;
    state.name = profile.name;
    state.worldTag = schema.worldTag;
    state.schema = schema;
    const preservedLocation = String(
      profile.currentLocation
      || existing?.profile?.currentLocation
      || state?.profile?.currentLocation
      || liveLocation
      || '',
    ).trim();
    state.profile = {
      ...(existing?.profile || {}),
      ...profile,
      ...(preservedLocation ? { currentLocation: preservedLocation } : {}),
    };
    state.note = profile.detail || state.note || '';
    window.GameModules.rpgState.upgradeCharacterState(state, schema);
    const locField = window.GameModules.currentLocationField;
    if (profile.isPlayer) {
      state.values.status_tags = ['玩家本人', '手机主人', profile.work, profile.role];
      state.profile.isPlayer = true;
    }
    if (preservedLocation && locField?.isValidProfileFormat?.(preservedLocation) && locField?.stateValueFromText) {
      state.values = state.values && typeof state.values === 'object' ? state.values : {};
      state.values.current_location = {
        ...(state.values.current_location || {}),
        ...locField.stateValueFromText(
          preservedLocation,
          store,
          '角色卡重建时保留当前位置链。',
          state.worldTag || state.profile?.work || window.GameModules.realWorld2026?.label || '未知世界',
        ),
      };
    }
    window.GameModules.rpgProfileMetrics?.rebase?.(state, profile, existing?.profile || {});
    store.initFactionSystem?.();
    window.GameModules.orgTerritory?.ensurePresetFamilyMemberships?.(store);
    await window.GameModules.rpgLexicon.syncState(state);
    const live = storeApi?.mergeOntoLive?.(state, store) || state;
    await this.saveState(live, store);
    return live;
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
    const id = store.roleCardSetup?.selectedPlayerId || '';
    const name = store.roleCardSetup?.selectedPlayerName || '';
    const card = this.byId(cards, id) || this.byName(cards, name) || cards.find((x) => x.isPlayer) || cards[0];
    if (!card) return null;
    return this.createState({ ...card, id: 'player-self', isPlayer: true }, store, 'player-self');
  },

  async saveSelectedRoleCardStates(store) {
    if (!store?.roleCardSetup?.usePredefinedPlayerCard) return [];
    const [player, relations] = await Promise.all([
      this.ensurePlayerState(store),
      this.saveSelectedInitialCardStates(store),
    ]);
    if (!player) throw new Error('玩家角色卡未创建成功，无法进入游戏');
    const states = [player, ...relations].filter(Boolean);
    this.ensureInitialSchedules(store, states);
    return states;
  },

  async saveSelectedInitialCardStates(store) {
    const cards = store?.roleCardSetup?.cards?.length ? store.roleCardSetup.cards : await this.loadAll();
    const playerId = store.roleCardSetup?.selectedPlayerId || '';
    const ids = Array.isArray(store.roleCardSetup?.selectedCardIds) ? store.roleCardSetup.selectedCardIds : [];
    const tasks = ids.filter((id) => id && id !== playerId).map((id) => {
      const card = this.byId(cards, id);
      return card ? this.createState(card, store, card.id || id) : null;
    }).filter(Boolean);
    const loaded = await Promise.all(tasks);
    return loaded.filter(Boolean);
  },

  playerProfileNeedsRoleCard(profile = {}) {
    const name = String(profile?.name || '').trim();
    return !profile?.roleCard || !name || name === 'player-self';
  },
};

window.GameModules.predefinedRoleCardActions = {
  async initPredefinedRoleCards() {
    const cards = await window.GameModules.predefinedRoleCards.loadAll();
    this.roleCardSetup.cards = cards;
    this.roleCardSetup.loaded = true;
    this.migrateRoleCardSelectionIds();
    if (!this.roleCardSetup.selectedPlayerId) {
      const player = cards.find((x) => x.isPlayer) || cards[0] || null;
      this.roleCardSetup.selectedPlayerId = window.GameModules.predefinedRoleCards.roleCardId(player);
      this.roleCardSetup.selectedPlayerName = player?.name || '';
    }
    if (!Array.isArray(this.roleCardSetup.selectedCardIds)) this.roleCardSetup.selectedCardIds = [];
    if (!this.roleCardSetup.selectedCardIds.length) this.roleCardSetup.selectedCardIds = cards.map((x) => window.GameModules.predefinedRoleCards.roleCardId(x)).filter(Boolean);
    this.pruneSelectedInitialCards();
    this.syncInitialCardPicker();
    if (!this.phoneSetupDone && this.roleCardSetup.usePredefinedPlayerCard) {
      this.applySelectedPlayerRoleCard();
    }
    if (this.phoneSetupDone && this.roleCardSetup.usePredefinedPlayerCard) {
      await this.repairSelectedPlayerRoleCardState();
    }
  },

  roleCardId(card = {}) { return window.GameModules.predefinedRoleCards.roleCardId(card); },
  selectedPlayerRoleCard() {
    return window.GameModules.predefinedRoleCards.byId(this.roleCardSetup.cards, this.roleCardSetup.selectedPlayerId)
      || window.GameModules.predefinedRoleCards.byName(this.roleCardSetup.cards, this.roleCardSetup.selectedPlayerName);
  },
  migrateRoleCardSelectionIds() {
    const tool = window.GameModules.predefinedRoleCards;
    const cards = this.roleCardSetup.cards || [];
    if (!this.roleCardSetup.selectedPlayerId && this.roleCardSetup.selectedPlayerName) {
      this.roleCardSetup.selectedPlayerId = tool.roleCardId(tool.byName(cards, this.roleCardSetup.selectedPlayerName));
    }
    if (!Array.isArray(this.roleCardSetup.selectedCardIds)) {
      this.roleCardSetup.selectedCardIds = Array.isArray(this.roleCardSetup.selectedCardNames)
        ? this.roleCardSetup.selectedCardNames.map((name) => tool.roleCardId(tool.byName(cards, name))).filter(Boolean)
        : [];
    }
  },
  selectedInitialRoleCards() {
    this.migrateRoleCardSelectionIds();
    const playerId = this.roleCardSetup.selectedPlayerId || '';
    return (this.roleCardSetup.selectedCardIds || [])
      .map((id) => window.GameModules.predefinedRoleCards.byId(this.roleCardSetup.cards, id))
      .filter((card) => window.GameModules.predefinedRoleCards.roleCardId(card) !== playerId)
      .filter(Boolean);
  },
  availableInitialRoleCards() {
    this.migrateRoleCardSelectionIds();
    const selected = new Set(this.roleCardSetup.selectedCardIds || []);
    const playerId = this.roleCardSetup.selectedPlayerId || '';
    return (this.roleCardSetup.cards || []).filter((card) => {
      const id = window.GameModules.predefinedRoleCards.roleCardId(card);
      return id && id !== playerId && !selected.has(id);
    });
  },
  pruneSelectedInitialCards() {
    this.migrateRoleCardSelectionIds();
    const playerId = this.roleCardSetup.selectedPlayerId || '';
    this.roleCardSetup.selectedCardIds = [...new Set(this.roleCardSetup.selectedCardIds || [])].filter((id) => id && id !== playerId);
  },
  syncInitialCardPicker() {
    this.pruneSelectedInitialCards();
    const list = this.availableInitialRoleCards();
    if (!list.some((card) => window.GameModules.predefinedRoleCards.roleCardId(card) === this.roleCardSetup.selectedCardId)) {
      this.roleCardSetup.selectedCardId = window.GameModules.predefinedRoleCards.roleCardId(list[0]);
    }
  },
  roleCardIdentitySummary(card) { return window.GameModules.predefinedRoleCards.identitySummary(card); },
  roleCardDetailSummary(card) { return window.GameModules.predefinedRoleCards.detailSummary(card); },

  selectPlayerRoleCard(id) {
    const card = window.GameModules.predefinedRoleCards.byId(this.roleCardSetup.cards, id);
    this.roleCardSetup.selectedPlayerId = id;
    this.roleCardSetup.selectedPlayerName = card?.name || '';
    this.pruneSelectedInitialCards();
    this.syncInitialCardPicker();
    this.applySelectedPlayerRoleCard();
  },

  applySelectedPlayerRoleCard() {
    const card = this.selectedPlayerRoleCard?.();
    if (!card) return;
    this.playerProfile = window.GameModules.predefinedRoleCards.playerProfileFromCard(card, this.playerProfile || {});
  },

  async repairSelectedPlayerRoleCardState() {
    if (!this.roleCardSetup?.usePredefinedPlayerCard) return null;
    const state = this.rpgStates?.['player-self'] || window.GameModules.characterStateStore?.get?.('player-self') || null;
    if (state?.profile && !window.GameModules.predefinedRoleCards.playerProfileNeedsRoleCard(state.profile)) return state;
    return window.GameModules.predefinedRoleCards.ensurePlayerState(this);
  },

  addSetupRoleCard() {
    const id = this.roleCardSetup.selectedCardId;
    if (!id || this.roleCardSetup.selectedCardIds.includes(id)) return;
    this.roleCardSetup.selectedCardIds = [...this.roleCardSetup.selectedCardIds, id];
    this.syncInitialCardPicker();
  },

  removeSetupRoleCard(id) {
    this.roleCardSetup.selectedCardIds = this.roleCardSetup.selectedCardIds.filter((item) => item !== id);
    this.syncInitialCardPicker();
  },
};
