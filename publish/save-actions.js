/**
 * 多存档与 RPG 状态动作。
 */
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
    this.ensureCatalogSelection();
    this.loadSavedRpgStates();
    await this.ensureRpgForCurrentCharacter();
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
    this.started = false;
    this.turn = 1;
    this.log = [];
    this.rpgStates = {};
    this.rpgPanelCharacterId = this.selectedCharacterId;
  },

  loadSavedRpgStates() {
    const states = window.GameModules.sqliteSave.listCharacterStates();
    this.rpgStates = Object.fromEntries(states.map((state) => [state.id, state]));
  },

  async ensureRpgForCurrentCharacter() {
    if (!window.GameModules.sqliteSave.db) return;
    const worldTag = this.character.work || '原创世界';
    await window.GameModules.worldLore.ensure(worldTag, this.sceneTitle || '首次进入');
    const state = await window.GameModules.rpgState.ensureCharacter(this.character);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    this.rpgPanelCharacterId = this.rpgPanelCharacterId || state.id;
  },

  async ensureRpgFromResults(result) {
    await this.ensureRpgForCurrentCharacter();
    const entries = [this.character, ...(result.appearedCharacters || [])];
    const context = `${this.sceneTitle} ${this.quest} ${result.narration || ''}`;
    for (const entry of entries) {
      const profile = await window.GameModules.characterProfile.ensure(entry, this, context);
      const state = await window.GameModules.rpgState.ensureCharacter(profile);
      this.rpgStates = { ...this.rpgStates, [state.id]: state };
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
    return [
      { key: 'health', label: '生命', value: values.health ?? 100 },
      { key: 'stamina', label: '精力', value: values.stamina ?? 100 },
      { key: 'mana', label: '魔力', value: values.mana ?? 100 },
    ];
  },

  rpgEntries(state) {
    if (!state?.schema) return [];
    const core = new Set(['health', 'stamina', 'mana']);
    return state.schema.sections.map((section) => ({
      title: section.title,
      fields: section.fields
        .filter((field) => !core.has(field.key))
        .map((field) => ({ label: field.label, value: state.values[field.key] })),
    })).filter((section) => section.fields.length);
  },

  memoryItems(kind) {
    return this.currentMemory?.[kind] || [];
  },

  async addManualMemory() {
    const text = this.memoryInput.trim();
    const state = this.currentRpgState;
    if (!text || !state) return;
    await window.GameModules.characterMemory.addManual(state.id, text, this);
    this.memoryInput = '';
  },

  async searchMemoryArchive() {
    const state = this.currentRpgState;
    const query = this.memoryArchiveQuery.trim();
    if (!state || !query) return;
    this.memoryArchiveResults = await window.GameModules.characterMemory.queryArchive(state.id, query);
  },
};
