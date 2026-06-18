window.GameModules = window.GameModules || {};

window.GameModules.rpgState = {
  async ensureWorldAttributes(worldTag) {
    const save = window.GameModules.sqliteSave;
    const attrs = window.GameModules.worldAttributes.defaults(worldTag);
    const existing = save.getWorldAttributes(worldTag);
    if (existing && window.GameModules.rpgSchema.sameFields(existing.fields, attrs.fields)) return existing;
    await save.saveWorldAttributes(worldTag, attrs);
    return attrs;
  },

  async ensureSchema(worldTag) {
    const save = window.GameModules.sqliteSave;
    const attrs = await this.ensureWorldAttributes(worldTag);
    const existing = save.getSchema(worldTag);
    const schema = window.GameModules.rpgSchema.base(worldTag, attrs);
    const schemaFields = schema.sections.flatMap((section) => section.fields);
    if (existing && window.GameModules.rpgSchema.matchesAttrs(existing, { fields: schemaFields })) return existing;
    console.log('[RPG状态] 固化世界属性 schema:', worldTag, attrs.fields?.length || 0);
    await save.saveSchema(worldTag, schema);
    return schema;
  },

  async ensureCharacter(character, store = null) {
    const save = window.GameModules.sqliteSave;
    const id = character.id || character.name;
    const existing = save.getCharacterState(id);
    if (existing) {
      console.log('[RPG状态] 使用已保存角色状态:', id, existing.worldTag);
      const schema = await this.ensureSchema(existing.worldTag || character.work || '原创世界');
      const profileChanged = this.ensureRoleCard(existing, character);
      const upgraded = this.upgradeCharacterState(existing, schema);
      const updated = this.updateExistingCharacter(existing, character, store);
      const inventorySynced = window.GameModules.progression.syncInventoryFromProfile?.(existing, existing.profile || character);
      const professionChanged = await window.GameModules.rpgProfessionState?.ensureInfo?.call(window.GameModules.rpgProfessionState, existing, character, schema);
      await window.GameModules.rpgLexicon.syncState(existing);
      if (profileChanged || upgraded || updated || inventorySynced || professionChanged) await save.saveCharacterState(existing);
      return existing;
    }
    const worldTag = save.getCharacterWorld(id) || character.work || '原创世界';
    console.log('[RPG状态] 创建角色状态:', id, character.name, worldTag);
    const schema = await this.ensureSchema(worldTag);
    const created = this.createCharacterState(character, schema, store);
    await window.GameModules.rpgProfessionState?.ensureInfo?.call(window.GameModules.rpgProfessionState, created, character, schema);
    await window.GameModules.rpgLexicon.syncState(created);
    await save.saveCharacterState(created);
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
      if (oldNameOk && newNameOk && profileTool?.isReusableRoleCard?.(oldProfile, character.roleCardInputSignature)) return false;
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
  updateExistingCharacter(state, character, store = null) {
    if (!state?.values || !store) return false;
    const profile = character || state.profile || {};
    const seed = this.seed(`${state.name}${state.worldTag}${store.entryCurrentAction || ''}${store.entryTimeLabel?.() || ''}`);
    const updated = Boolean(window.GameModules.rpgInitializer?.updateExisting(state, profile, store, seed));
    return window.GameModules.rpgAge.sync(state.values, profile, store) || updated;
  },

  upgradeCharacterState(state, schema) {
    let changed = false;
    state.worldTag = schema.worldTag;
    if (!state.schema || !window.GameModules.rpgSchema.matchesAttrs(state.schema, { fields: schema.sections.flatMap((section) => section.fields) })) {
      state.schema = schema;
      changed = true;
    }
    if (!state.values) state.values = {};
    state.values.world_tag = state.worldTag;
    const seed = this.seed(state.name + state.worldTag);
    schema.sections.forEach((section) => section.fields.forEach((field) => {
      if (state.values[field.key] === undefined) {
        if (field.key === 'free_attribute_points') state.values[field.key] = 0;
        else if (field.key === 'level_growth') state.values[field.key] = { totalLevelUps: 0, autoPointsPerLevel: 1, freePointsPerLevel: 1, history: [] };
        else state.values[field.key] = ['health', 'stamina'].includes(field.key) ? 100 : this.valueFor(field, seed + field.key.length);
        changed = true;
      }
    }));
    const worldChanged = this.normalizeWorldValues(state), jobChanged = window.GameModules.rpgProfessionState.normalizeProfessions(state), controlChanged = this.ensureControlExperience(state), metricsChanged = this.ensureCharacterMetrics(state);
    const reasonChanged = this.ensureRpgFieldReasons(state);
    const socialChanged = this.syncSocialPositions(state);
    const inventoryChanged = window.GameModules.progression.ensureInventoryFields?.(state.values);
    const mechanicsChanged = window.GameModules.progression.ensureStateMechanics(state);
    return worldChanged || jobChanged || controlChanged || metricsChanged || reasonChanged || socialChanged || inventoryChanged || mechanicsChanged || changed;
  },
  ensureRpgFieldReasons(state) {
    if (!state?.profile) throw new Error('个人资料缺失，无法校验RPG变化原因');
    const tool = window.GameModules.characterProfile;
    const before = JSON.stringify(state.profile.rpgFieldReasons || {});
    state.profile.worldAttributes = state.profile.worldAttributes || { fields: (state.schema?.sections || []).flatMap((section) => section.fields || []) };
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

  syncSocialPositions(state) {
    if (!state?.values || !state?.profile) return false;
    let changed = false;
    const profile = state.profile;
    const factions = Array.isArray(profile.factions) ? profile.factions : [];
    const forces = Array.isArray(profile.force_positions) ? profile.force_positions : [];
    if ((!Array.isArray(state.values.factions) || !state.values.factions.length) && factions.length) {
      state.values.factions = factions;
      changed = true;
    }
    if ((!Array.isArray(state.values.force_positions) || !state.values.force_positions.length) && forces.length) {
      state.values.force_positions = forces;
      changed = true;
    }
    return changed;
  },

  ensureControlExperience(state) {
    let changed = false;
    if (!state.values) state.values = {};
    if (!state.values.control_experience) {
      state.values.control_experience = { onlineCount: 0, feeling: '未知', adaptation: 0, summary: '尚未经历上线操控。', lastUpdated: '' };
      changed = true;
    }
    const sections = state.schema?.sections || [];
    const itemSection = sections.find((section) => section.title === '习得与职业') || sections.find((section) => section.fields.some((field) => field.key === 'status_tags')) || sections.at(-1);
    if (itemSection && !itemSection.fields.some((field) => field.key === 'control_experience')) {
      itemSection.fields.push({ key: 'control_experience', label: '上线体验', type: 'text' });
      changed = true;
    }
    return changed;
  },

  createCharacterState(character, schema, store = null) {
    const seed = this.seed(character.name + character.role + schema.worldTag + (character.detail || '') + (store?.entryCurrentAction || ''));
    const values = { world_tag: schema.worldTag, health: 100, stamina: 100 };
    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (['world_tag', 'health', 'stamina', 'age'].includes(field.key)) continue;
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
    window.GameModules.rpgAge.sync(values, character, store);
    values.status_tags = [character.role, character.importance === 'minor' ? '路人' : '可被操控', schema.worldTag];
    values.control_experience = { onlineCount: 0, feeling: '未知', adaptation: 0, summary: '尚未经历上线操控。', lastUpdated: '' };
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
    window.GameModules.progression.syncInventoryFromProfile?.(state, character);
    this.ensureCharacterMetrics(state);
    return state;
  },


  valueFor(field, seed) {
    if (field.type === 'number') return field.min + (seed % ((field.max - field.min) + 1));
    if (field.type === 'rank') return ['E', 'D', 'C', 'B', 'A', 'EX'][seed % 6];
    return field.type === 'list' ? [] : '';
  },
  seed(text) { return [...String(text)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0); },
};
