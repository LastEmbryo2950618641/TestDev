window.GameModules = window.GameModules || {};

window.GameModules.saveActions = {
  async refreshSaveMetas() {
    const entries = await Promise.all(this.saveSlots.map(async (slot) => [slot, await window.GameModules.sqliteSave.inspectSlot(slot)]));
    this.saveMetas = Object.fromEntries(entries);
  },

  saveMeta(slot) {
    return this.saveMetas[slot] || { slot, exists: false, savedAt: '' };
  },

  formatSaveTime(value) {
    if (!value) return '无存档';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '时间未知';
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  },

  async openSlot(slot) {
    this.selectedSlot = slot;
    await window.GameModules.storage.open(slot);
    const save = await window.GameModules.storage.get();
    if (save) window.GameModules.storage.restore(this, save);
    await this.loadWritingStyles();
    this.ensureCatalogSelection();
    this.loadSavedRpgStates();
    if (this.phoneSetupDone) await this.ensurePlayerRpgState?.();
    this.prepareRpgForSelectedCharacter();
  },

  async loadSlot(slot) {
    if (this.busy || !this.saveMeta(slot).exists) return;
    await this.openSlot(slot);
    await this.refreshSaveMetas();
    this.saveMessage = `已读取 ${slot}`;
    this.savePanelOpen = false;
  },

  async overwriteSlot(slot) {
    if (this.busy) return;
    const states = Object.values(this.rpgStates);
    const memories = states.map((state) => [state.id, window.GameModules.sqliteSave.getCharacterMemory(state.id), window.GameModules.sqliteSave.listMemoryArchives(state.id)]);
    await window.GameModules.storage.remove(slot);
    this.selectedSlot = slot;
    await window.GameModules.storage.open(slot);
    for (const state of states) {
      await window.GameModules.sqliteSave.saveSchema(state.worldTag, state.schema);
      await window.GameModules.sqliteSave.saveCharacterState(state);
    }
    for (const [id, memory, archives] of memories) {
      if (memory) await window.GameModules.sqliteSave.saveCharacterMemory(id, memory);
      for (const archive of archives) await window.GameModules.sqliteSave.saveMemoryArchive(id, archive);
    }
    this.loadSavedRpgStates();
    await this.ensureRpgForCurrentCharacter();
    await this.save();
    await this.refreshSaveMetas();
    this.saveMessage = `已删除旧档并覆盖保存 ${slot}`;
  },

  async newSlot(slot) {
    await window.GameModules.storage.remove(slot);
    this.selectedSlot = slot;
    await window.GameModules.storage.open(slot);
    await this.loadWritingStyles();
    this.started = false;
    this.turn = 1;
    this.log = [];
    this.rpgStates = {};
    this.rpgPanelCharacterId = this.selectedCharacterId;
    if (this.phoneSetupDone) await this.ensurePlayerRpgState?.(true);
  },

  loadSavedRpgStates() {
    const states = window.GameModules.sqliteSave.listCharacterStates();
    this.rpgStates = Object.fromEntries(states.map((state) => [state.id, state]));
  },

  prepareRpgSchemaForSelectedWork() {
    if (!window.GameModules.sqliteSave.db || !this.character?.work) return null;
    const worldTag = this.character.work || '原创世界';
    return window.GameModules.rpgState.ensureSchema(worldTag).catch((err) => {
      console.warn('[RPG状态] schema 预热失败:', worldTag, err.message, err.stack);
      return null;
    });
  },

  prepareRpgForSelectedCharacter() {
    return this.prepareRpgSchemaForSelectedWork();
  },

  async ensureRpgForCharacter(character, context = '', options = {}) {
    if (!window.GameModules.sqliteSave.db || !character) return null;
    const worldTag = character.work || '原创世界';
    console.log('[RPG状态] 准备角色状态:', worldTag, character.name);
    const profile = await window.GameModules.characterProfile.ensure(character, this, context || this.entryCurrentAction || this.sceneTitle || '');
    const state = await window.GameModules.rpgState.ensureCharacter(profile, this);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    if (options.loadMetrics !== false && state.id === this.character.id) this.loadMetricsFromCharacterState(state);
    this.rpgPanelCharacterId = this.rpgPanelCharacterId || state.id;
    return state;
  },

  async ensureRpgForCurrentCharacter(options = {}) {
    if (!options.refresh && window.GameModules.cache.enabled('generatedProfiles') && this.rpgStates[this.character.id]) {
      this.loadMetricsFromCharacterState(this.rpgStates[this.character.id]);
      return this.rpgStates[this.character.id];
    }
    return this.ensureRpgForCharacter(this.character, this.entryCurrentAction || this.sceneTitle || '');
  },

  async ensureRpgFromResults(result) {
    await this.ensureRpgForCurrentCharacter();
    const entries = [this.character, ...(result.appearedCharacters || [])];
    const context = `${this.sceneTitle} ${this.quest} ${result.narration || ''}`;
    for (const entry of entries) {
      await this.ensureRpgForCharacter(entry, context, { loadMetrics: entry.id === this.character.id });
    }
  },

  findKnownCharacter(name) {
    if (!name) return null;
    for (const work of this.works) {
      const hit = work.characters.find((char) => char.name === name || (char.aliases || []).includes(name));
      if (hit) return hit;
    }
    return null;
  },

  rpgVitals(state) {
    const values = state?.values || {};
    const percent = (pool) => pool?.max ? Math.round((pool.current / pool.max) * 100) : 100;
    return [
      { key: 'health', label: '生命力', value: values.health ?? percent(values.vitality), text: this.rpgFieldValue(values.vitality) },
      { key: 'stamina', label: '精力', value: values.stamina ?? percent(values.stamina_pool), text: this.rpgFieldValue(values.stamina_pool) },
    ];
  },

  rpgFieldValue(value) {
    if (Array.isArray(value)) return value.map((item) => this.rpgFieldValue(item));
    if (!value || typeof value !== 'object') return value;
    if (Object.prototype.hasOwnProperty.call(value, 'next')) return `${value.current || 0}/${value.next || 'max'}`;
    if (Object.prototype.hasOwnProperty.call(value, 'current')) return `${value.current}/${value.max}`;
    if (value.type === '职业') return `${value.name} lv.${value.level || 1}`;
    if (Object.prototype.hasOwnProperty.call(value, 'onlineCount')) {
      return `上线${value.onlineCount || 0}次｜${value.feeling || '未知'}｜适应${value.adaptation || 0}/100｜${value.summary || ''}`;
    }
    if (Object.prototype.hasOwnProperty.call(value, 'totalLevelUps')) return `累计升级${value.totalLevelUps || 0}次｜自动${value.autoPointsPerLevel || 2}点/级｜自由${value.freePointsPerLevel || 1}点/级`;
    if (value.attackPower || value.defensePower) return `攻${value.attackPower || 0}｜防${value.defensePower || 0}｜${value.damageRuleNote || ''}`;
    if (value.effectiveDamage !== undefined) return `${value.summary || '战斗模拟'}｜伤害${value.effectiveDamage}`;
    if (value.level) return `${value.name} lv${value.level}（${value.type || '能力'}）`;
    return JSON.stringify(value);
  },

  rpgEntries(state) {
    if (!state?.schema) return [];
    window.GameModules.progression.ensureStateMechanics(state, state.profile || {});
    return state.schema.sections.map((section) => ({
      title: section.title,
      fields: section.fields
        .map((field) => {
          const raw = field.key === 'exp' ? window.GameModules.progression.normalizeCharacterExp(state.values.exp, state.values.level) : state.values[field.key];
          const display = window.GameModules.worldAttributes.displayValue(field, raw);
          const source = state.values.intrinsic_sources?.[field.key] || null;
          const kind = { factions: '阵营', force_positions: '势力地位', equipment: '装备', status_tags: '状态' }[field.key] || '属性';
          const targetType = state.profile?.isPlayer ? '非角色' : '角色';
          const commonField = section.title !== '世界固有属性' && field.key !== 'world_tag';
          return { key: field.key, label: field.label, kind, value: this.rpgFieldValue(display), raw, source, desc: field.desc || '', worldTag: state.worldTag, targetType, commonField };
        }),
    })).filter((section) => section.fields.length);
  },


  memoryItems(kind) {
    const memory = this.currentMemory;
    if (kind === 'shortTerm') return [...(memory.shortTerm.recent || []), ...(memory.shortTerm.summarized || [])];
    if (kind === 'longTerm') return [...(memory.longTerm.vivid || []), ...(memory.longTerm.permanent || [])];
    return [];
  },

  memoryStatus(kind) {
    const memory = this.currentMemory;
    const m = window.GameModules.characterMemory;
    if (kind === 'shortTerm') return [m.statLine('刚发生记忆', m.stats(memory.shortTerm.recent, m.limits.recent)), m.statLine('近发生记忆', m.stats(memory.shortTerm.summarized, m.limits.summarized)), m.statLine('遗忘区', m.stats(memory.shortTerm.forgotten, m.limits.forgotten))].join('｜');
    return [m.statLine('难以忘记', m.stats(memory.longTerm.vivid, m.limits.vivid)), m.statLine('不可忘记', m.stats(memory.longTerm.permanent, m.limits.permanent))].join('｜');
  },

  async addManualMemory() {
    const text = this.memoryInput.trim();
    const state = this.currentRpgState;
    if (!text || !state) return;
    await window.GameModules.characterMemory.addManual(state.id, text, this);
    this.memoryInput = '';
  },

  async searchMemoryArchive() {
    const state = this.characterRpgState;
    const query = this.memoryArchiveQuery.trim();
    if (!state || !query) return;
    this.memoryArchiveResults = await window.GameModules.characterMemory.queryArchive(state.id, query);
  },
};
