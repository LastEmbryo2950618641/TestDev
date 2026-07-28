window.GameModules = window.GameModules || {};

window.GameModules.rpgState = {
  async ensureWorldAttributes(worldTag) {
    const definitionStore = window.GameModules.rpgDefinitionStore;
    const attrs = window.GameModules.worldAttributes.defaults(worldTag);
    const existing = definitionStore?.getAttributes?.(worldTag);
    if (existing && window.GameModules.rpgSchema.sameFields(existing.fields, attrs.fields)) return existing;
    await definitionStore?.saveAttributes?.(worldTag, attrs);
    return attrs;
  },

  async ensureSchema(worldTag) {
    const definitionStore = window.GameModules.rpgDefinitionStore;
    const attrs = await this.ensureWorldAttributes(worldTag);
    const existing = definitionStore?.getSchema?.(worldTag);
    const schema = window.GameModules.rpgSchema.base(worldTag, attrs);
    const schemaFields = schema.sections.flatMap((section) => section.fields);
    if (existing && window.GameModules.rpgSchema.matchesAttrs(existing, { fields: schemaFields })) return existing;
    console.log('[RPG状态] 固化世界属性 schema:', worldTag, attrs.fields?.length || 0);
    await definitionStore?.saveSchema?.(worldTag, schema);
    return schema;
  },

  async ensureCharacter(character, store = null) {
    const stateStore = window.GameModules.characterStateStore;
    const id = character.id || character.name;
    const existing = stateStore?.get?.(id);
    if (existing) {
      console.log('[RPG状态] 使用已保存角色状态:', id, existing.worldTag);
      const schema = await this.ensureSchema(existing.worldTag || character.work || '原创世界');
      const profileChanged = this.ensureRoleCard(existing, character);
      const upgraded = this.upgradeCharacterState(existing, schema);
      const updated = this.updateExistingCharacter(existing, character, store);
      const migrated = this.migrateProfileOwnedFields(existing);
      const professionChanged = await window.GameModules.rpgProfessionState?.ensureInfo?.call(window.GameModules.rpgProfessionState, existing, character, schema);
      await window.GameModules.rpgLexicon.syncState(existing);
      if (profileChanged || upgraded || updated || migrated || professionChanged) await stateStore?.save?.(existing);
      return existing;
    }
    const worldTag = stateStore?.getWorld?.(id) || character.work || '原创世界';
    console.log('[RPG状态] 创建角色状态:', id, character.name, worldTag);
    const schema = await this.ensureSchema(worldTag);
    const created = this.createCharacterState(character, schema, store);
    await window.GameModules.rpgProfessionState?.ensureInfo?.call(window.GameModules.rpgProfessionState, created, character, schema);
    await window.GameModules.rpgLexicon.syncState(created);
    await stateStore?.save?.(created);
    return created;
  },
  ensureRoleCard(state, character) {
    if (!state || !character?.roleCard) return false;
    const oldProfile = state.profile || {};
    if (oldProfile.roleCard && oldProfile.roleCardUpdatedAt) {
      const sameRoleCard = oldProfile.roleCardInputSignature === character.roleCardInputSignature;
      const profileTool = window.GameModules.characterProfile;
      const oldNameOk = profileTool?.isConcreteName?.(oldProfile.name) !== false;
      const newNameOk = profileTool?.isConcreteName?.(character.name) !== false;
      const freshAiProfile = character.roleCardSource === 'ai' && character.roleCardUpdatedAt && character.roleCardUpdatedAt !== oldProfile.roleCardUpdatedAt;
      if (!freshAiProfile && !character.forceRoleCardRegenerate && oldNameOk && newNameOk && profileTool?.isReusableRoleCard?.(oldProfile, character.roleCardInputSignature)) return false;
      state.profile = { ...oldProfile, ...character, roleCard: true };
      state.note = state.profile.detail || state.profile.personality || state.note || '';
      const metricsChanged = sameRoleCard
        ? window.GameModules.rpgProfileMetrics?.apply(state, state.profile)
        : window.GameModules.rpgProfileMetrics?.rebase(state, state.profile, oldProfile);
      return metricsChanged || true;
    }
    state.profile = { ...oldProfile, ...character, roleCard: true };
    state.note = state.profile.detail || state.profile.personality || state.note || '';
    return true;
  },
  profileOwnedValueKeys() {
    return ['world_tag', 'age', 'age_label', 'factions', 'memberships', 'items', 'wearing', 'knowledge', 'skills', 'professions', 'control_experience'];
  },
  cloneProfileValue(value) {
    if (Array.isArray(value)) return value.map((item) => (item && typeof item === 'object' ? { ...item } : item));
    if (value && typeof value === 'object') return { ...value };
    return value;
  },
  defaultControlExperience() {
    return {
      onlineCount: 0,
      feeling: '未知',
      adaptation: 0,
      summary: '尚未经历上线操控。',
      controllerAwarenessLevel: 'unknown',
      controllerAwareness: '尚不知晓控制者是谁',
      lastUpdated: '',
    };
  },
  emptyProfileValue(value) {
    return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
  },
  stripProfileOwnedValues(state) {
    if (!state?.values) return false;
    let changed = false;
    for (const key of this.profileOwnedValueKeys()) {
      if (Object.prototype.hasOwnProperty.call(state.values, key)) {
        delete state.values[key];
        changed = true;
      }
    }
    return changed;
  },
  migrateProfileOwnedFields(state) {
    if (!state) return false;
    state.profile = state.profile && typeof state.profile === 'object' ? state.profile : {};
    state.values = state.values && typeof state.values === 'object' ? state.values : {};
    const profile = state.profile;
    const values = state.values;
    let changed = false;
    const fill = (profileKey, valueKey = profileKey) => {
      if (!this.emptyProfileValue(profile[profileKey]) || this.emptyProfileValue(values[valueKey])) return;
      profile[profileKey] = this.cloneProfileValue(values[valueKey]);
      changed = true;
    };
    if (this.emptyProfileValue(profile.worldTag) && !this.emptyProfileValue(values.world_tag)) {
      profile.worldTag = this.cloneProfileValue(values.world_tag);
      changed = true;
    }
    fill('age');
    fill('factions');
    fill('memberships');
    fill('items');
    fill('knowledge');
    fill('skills');
    fill('professions');
    fill('control_experience');
    if (this.emptyProfileValue(profile.wearingItems) && !this.emptyProfileValue(values.wearing)) {
      profile.wearingItems = this.cloneProfileValue(values.wearing);
      changed = true;
    }
    if (this.emptyProfileValue(profile.wearing) && !this.emptyProfileValue(profile.wearingItems)) {
      profile.wearing = this.cloneProfileValue(profile.wearingItems);
      changed = true;
    }
    if (this.emptyProfileValue(profile.control_experience)) {
      profile.control_experience = this.defaultControlExperience();
      changed = true;
    } else {
      const awareness = window.GameModules.controlExperienceStage?.normalizeControllerAwareness?.(profile.control_experience);
      if (awareness && (
        profile.control_experience.controllerAwarenessLevel !== awareness.controllerAwarenessLevel
        || profile.control_experience.controllerAwareness !== awareness.controllerAwareness
      )) {
        profile.control_experience.controllerAwarenessLevel = awareness.controllerAwarenessLevel;
        profile.control_experience.controllerAwareness = awareness.controllerAwareness;
        changed = true;
      }
    }
    const stripped = this.stripProfileOwnedValues(state);
    if ((changed || stripped) && profile) profile.roleCardUpdatedAt = profile.roleCardUpdatedAt || new Date().toISOString();
    return changed || stripped;
  },
  updateExistingCharacter(state, character, store = null) {
    if (!state?.values || !store) return false;
    const profile = character || state.profile || {};
    const seed = this.seed(`${state.name}${state.worldTag}${store.entryCurrentAction || ''}${store.entryTimeLabel?.() || ''}`);
    const updated = Boolean(window.GameModules.rpgInitializer?.updateExisting(state, profile, store, seed));
    return window.GameModules.rpgAge.sync(state, profile, store) || updated || this.migrateProfileOwnedFields(state);
  },
  upgradeCharacterState(state, schema) {
    let changed = false;
    state.worldTag = schema.worldTag;
    if (!state.schema || !window.GameModules.rpgSchema.matchesAttrs(state.schema, { fields: schema.sections.flatMap((section) => section.fields) })) {
      state.schema = schema;
      changed = true;
    }
    if (!state.values) state.values = {};
    const seed = this.seed(state.name + state.worldTag);
    schema.sections.forEach((section) => section.fields.forEach((field) => {
      if (this.profileOwnedValueKeys().includes(field.key)) return;
      if (state.values[field.key] === undefined) {
        if (field.key === 'free_attribute_points') state.values[field.key] = 0;
        else if (field.key === 'level_growth') state.values[field.key] = { totalLevelUps: 0, autoPointsPerLevel: 1, freePointsPerLevel: 1, history: [] };
        else state.values[field.key] = ['health', 'stamina'].includes(field.key) ? 100 : this.valueFor(field, seed + field.key.length);
        changed = true;
      }
    }));
    const profileMigrationChanged = this.migrateProfileOwnedFields(state);
    const worldChanged = this.normalizeWorldValues(state), jobChanged = window.GameModules.rpgProfessionState.normalizeProfessions(state), controlChanged = this.ensureControlExperience(state), locationChanged = this.ensureCurrentLocation(state), metricsChanged = this.ensureCharacterMetrics(state);
    const intimacyChanged = window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', state);
    const reasonChanged = this.ensureRpgFieldReasons(state);
    const socialChanged = this.syncSocialPositions(state);
    const mechanicsChanged = window.GameModules.progression.ensureStateMechanics(state);
    return worldChanged || jobChanged || controlChanged || locationChanged || intimacyChanged || metricsChanged || reasonChanged || socialChanged || profileMigrationChanged || mechanicsChanged || changed;
  },
  ensureRpgFieldReasons(state) {
    if (!state?.profile) throw new Error('个人资料缺失，无法校验RPG变化原因');
    const tool = window.GameModules.characterProfile;
    const before = JSON.stringify(state.profile.rpgFieldReasons || {});
    state.profile.worldAttributes = state.profile.worldAttributes || { fields: (state.schema?.sections || []).flatMap((section) => section.fields || []) };
    const keys = tool.rpgFieldReasonKeys?.(state.profile.worldAttributes) || [];
    const fallback = window.GameModules.characterReasonFallback?.rpgReasons?.(state.profile, state.profile.worldAttributes) || {};
    const name = state.profile.name || state.name || state.id || '角色';
    state.profile.rpgFieldReasons = state.profile.rpgFieldReasons || {};
    keys.forEach((key) => {
      if (tool.validRpgReasonText?.(state.profile.rpgFieldReasons[key])) return;
      state.profile.rpgFieldReasons[key] = String(fallback[key] || `${name}的${key}由预定义角色卡资料初始化。`).slice(0, 120);
    });
    state.profile.rpgFieldReasons = tool.requireRpgFieldReasons(state.profile, state.profile.worldAttributes, state.profile.name || state.name || state.id);
    return before !== JSON.stringify(state.profile.rpgFieldReasons || {});
  },

  ensureCharacterMetrics(state) {
    if (!state || state.id === 'player-self') return false;
    const before = JSON.stringify(state.metrics || {}), fresh = window.GameModules.metrics.fresh();
    state.metrics = state.metrics || {};
    state.metrics.emotions = window.GameModules.metrics.fill(state.metrics.emotions, window.GameModules.metrics.emotionKeys, fresh.emotions);
    state.metrics.playerFeelings = window.GameModules.metrics.fill(state.metrics.playerFeelings, window.GameModules.metrics.playerKeys, fresh.playerFeelings);
    state.metrics.notes = state.metrics.notes || {};
    window.GameModules.rpgProfileMetrics?.apply(state, state.profile);
    return before !== JSON.stringify(state.metrics);
  },
  syncSocialFields(state, source = 'profile', store = null, options = {}) {
    if (!state?.profile) return false;
    state.values = state.values && typeof state.values === 'object' ? state.values : {};
    const input = source === 'values' ? state.values : state.profile;
    const clone = (value) => (Array.isArray(value) ? value.map((item) => (
      item && typeof item === 'object' ? { ...item } : item
    )) : []);
    const before = JSON.stringify({
      profileFactions: state.profile.factions || [],
      profileMemberships: state.profile.memberships || [],
    });
    state.profile.factions = clone(input.factions);
    state.profile.memberships = clone(input.memberships);
    if (!options.skipOrgNormalization) {
      window.GameModules.orgTerritory?.syncCharacterOrgMemberships?.(state, store, { skipSocialSync: true });
    }
    const stripped = this.stripProfileOwnedValues(state);
    const changed = before !== JSON.stringify({
      profileFactions: state.profile.factions,
      profileMemberships: state.profile.memberships,
    });
    if (changed || stripped) state.profile.roleCardUpdatedAt = store?.phoneDateText?.() || new Date().toISOString();
    return changed || stripped;
  },

  syncSocialPositions(state) {
    return this.syncSocialFields(state, 'profile', null);
  },

  isInvalidLocationName(name = '') {
    return !String(name || '').trim() || /^剧情起始时间｜/.test(String(name || '')) || /^公元纪年｜/.test(String(name || ''));
  },

  initialLocationName(character = {}, store = null) {
    const explicit = character.currentLocation || character.locationName || character.location || character.place;
    if (!this.isInvalidLocationName(explicit)) return String(explicit).trim();
    const realWorld = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const world = character.work || store?.selectedWork || '';
    if ((world === realWorld || /现实|现代都市|2026/.test(world)) && !this.isInvalidLocationName(store?.realWorldLocationName)) return store.realWorldLocationName;
    return '当前位置未知';
  },

  ensureCurrentLocation(state) {
    let changed = false;
    if (!state.values) state.values = {};
    if (Object.prototype.hasOwnProperty.call(state.values, 'current_location')) {
      delete state.values.current_location;
      changed = true;
    }
    const sections = state.schema?.sections || [];
    const identity = sections.find((section) => section.title === '身份信息' || section.fields.some((field) => field.key === 'world_tag')) || sections[0];
    if (identity?.fields?.some((field) => field.key === 'current_location')) {
      identity.fields = identity.fields.filter((field) => field.key !== 'current_location');
      changed = true;
    }
    return changed;
  },

  ensureControlExperience(state) {
    let changed = false;
    if (!state.profile) state.profile = {};
    if (!state.profile.control_experience) {
      state.profile.control_experience = this.defaultControlExperience();
      changed = true;
    } else {
      const awareness = window.GameModules.controlExperienceStage?.normalizeControllerAwareness?.(state.profile.control_experience);
      if (awareness && (
        state.profile.control_experience.controllerAwarenessLevel !== awareness.controllerAwarenessLevel
        || state.profile.control_experience.controllerAwareness !== awareness.controllerAwareness
      )) {
        state.profile.control_experience.controllerAwarenessLevel = awareness.controllerAwarenessLevel;
        state.profile.control_experience.controllerAwareness = awareness.controllerAwareness;
        changed = true;
      }
    }
    const sections = state.schema?.sections || [];
    const itemSection = sections.find((section) => section.title === '习得与职业') || sections.find((section) => section.fields.some((field) => field.key === 'status_tags')) || sections.at(-1);
    if (itemSection && !itemSection.fields.some((field) => field.key === 'control_experience')) {
      itemSection.fields.push({ key: 'control_experience', label: '上线体验', type: 'text' });
      changed = true;
    }
    return this.stripProfileOwnedValues(state) || changed;
  },
  createCharacterState(character, schema, store = null) {
    const seed = this.seed(character.name + character.role + schema.worldTag + (character.detail || '') + (store?.entryCurrentAction || ''));
    const values = { health: 100, stamina: 100 };
    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (['health', 'stamina'].includes(field.key) || this.profileOwnedValueKeys().includes(field.key)) continue;
        values[field.key] = this.valueFor(field, seed + field.key.length);
      }
    }
    Object.assign(values, window.GameModules.progression.createValues(character, seed, values));
    const worldFields = schema.sections.find((section) => section.title === '世界固有属性')?.fields || [];
    window.GameModules.rpgInitializer?.apply(values, character, store, seed, { fields: worldFields });
    window.GameModules.rpgInitializer?.touch(values, store);
    window.GameModules.progression.ensureIntrinsicSources(values);
    window.GameModules.progression.ensureProgressionNotes(values);
    values.derived = window.GameModules.progression.derived(values);
    values.combat_simulation = window.GameModules.progression.defaultCombat(values);
    Object.assign(values, character.worldValues || {});
    window.GameModules.rpgAge.sync({ values, profile: character }, character, store);
    values.status_tags = [character.role, character.importance === 'minor' ? '路人' : '可被操控', schema.worldTag];
    character.control_experience = character.control_experience || this.defaultControlExperience();
    values.intimacy = window.GameModules.initPromptRegistry?.markPendingInit?.(window.GameModules.initPromptRegistry?.defaultValue?.('intimacyBody', 'intimacy') || {});
    values.bodyStatus = window.GameModules.initPromptRegistry?.markPendingInit?.(window.GameModules.initPromptRegistry?.defaultValue?.('intimacyBody', 'bodyStatus') || {});
    const state = {
      id: character.id,
      name: character.name,
      worldTag: schema.worldTag,
      schema,
      values,
      profile: character,
      note: character.detail || character.personality || '',
      firstAppearedAt: values.updatedAt,
      firstAppearedGameTime: values.updatedGameTime,
    };
    this.ensureControlExperience(state);
    this.ensureCurrentLocation(state);
    this.migrateProfileOwnedFields(state);
    this.ensureCharacterMetrics(state);
    return state;
  }, valueFor(field, seed) {
    if (field.type === 'number') return field.min + (seed % ((field.max - field.min) + 1));
    if (field.type === 'rank') return ['E', 'D', 'C', 'B', 'A', 'EX'][seed % 6];
    return field.type === 'list' ? [] : '';
  },
  seed(text) { return [...String(text)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0); },
};
