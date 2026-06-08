/**
 * 多存档与 RPG 状态动作。
 */
window.GameModules = window.GameModules || {};

window.GameModules.saveActions = {
  async openSlot(slot) {
    this.selectedSlot = slot;
    await window.GameModules.storage.open(slot);
    const save = await window.GameModules.storage.get();
    if (save) window.GameModules.storage.restore(this, save);
    this.ensureCatalogSelection();
    this.loadSavedRpgStates();
    await this.ensureRpgForCurrentCharacter();
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
    const state = await window.GameModules.rpgState.ensureCharacter(this.character);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    this.rpgPanelCharacterId = this.rpgPanelCharacterId || state.id;
  },

  async ensureRpgFromResults(result) {
    await this.ensureRpgForCurrentCharacter();
    const names = [this.character.name, ...(result.appearedCharacters || [])];
    for (const name of names) {
      const found = this.findKnownCharacter(name);
      if (found) {
        const state = await window.GameModules.rpgState.ensureCharacter(found);
        this.rpgStates = { ...this.rpgStates, [state.id]: state };
      }
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

  rpgEntries(state) {
    if (!state?.schema) return [];
    return state.schema.sections.map((section) => ({
      title: section.title,
      fields: section.fields.map((field) => ({ label: field.label, value: state.values[field.key] })),
    }));
  },
};
