window.GameModules = window.GameModules || {};

window.GameModules.wearingSyncActions = {
  async syncSolidifyWearing(cards = []) {
    for (const card of Array.isArray(cards) ? cards : []) {
      await this.syncWearingForName(card.name, card.wearing || card.clothing || card.outfit, card);
    }
  },

  async syncNarrationWearing(result = {}) {
    const text = String(result.narration || result.text || '');
    const names = new Set([
      ...(result.appearedCharacters || []).map((x) => x?.name),
      ...(result.solidifiableCharacters || []).map((x) => x?.name),
      ...(window.GameModules.sqliteSave.listCharacterStates?.() || []).map((x) => x?.profile?.name || x?.name),
    ].filter(Boolean));

    for (const name of names) {
      const wearing = this.extractNarrationWearing(text, name);
      if (wearing) {
        await this.syncWearingForName(name, wearing, { name, worldTag: window.GameModules.realWorld2026?.label });
      }
    }
  },

  extractNarrationWearing(text = '', name = '') {
    const source = String(text || '');
    const target = String(name || '').trim();
    if (!target || !source.includes(target)) return '';

    const segment = source.slice(source.indexOf(target), source.indexOf(target) + 260);
    const markers = ['穿着', '绌跨潃', '身上', '韬笂', '穿了一件', '涓€浠'];

    for (const marker of markers) {
      const index = segment.indexOf(marker);
      if (index === -1) continue;
      const candidate = segment.slice(index + marker.length).trim();
      if (!candidate) continue;
      const endIndex = candidate.search(/[，。；：？！]/u);
      const value = (endIndex >= 0 ? candidate.slice(0, endIndex) : candidate).trim();
      if (value) return value;
    }

    return '';
  },

  async syncWearingForName(name = '', raw = '', card = {}) {
    const state = window.GameModules.characterIntroCard.roleCardState({ ...card, name }) || this.itemSkillState?.(name);
    const items = this.solidifyWearingItems({ ...card, wearing: raw }, state);
    if (!state?.values || !items.length) return false;

    const p = window.GameModules.progression;
    p.ensureInventoryFields?.(state.values, state.id || '');
    const before = JSON.stringify(state.values.wearing || []);
    state.values.wearing = p.mergeProfileWearing?.(state.values.wearing || [], items) || items;

    if (state.profile) {
      state.profile.wearingItems = p.mergeProfileWearing?.(state.profile.wearingItems || [], items) || items;
      state.profile.wearing = p.mergeProfileWearing?.(state.profile.wearing || [], items) || items;
      state.profile.roleCardUpdatedAt = new Date().toISOString();
    }

    if (before === JSON.stringify(state.values.wearing || [])) return false;
    this.rpgStates = { ...(this.rpgStates || {}), [state.id]: state };
    await window.GameModules.characterStateStore?.save?.(state);
    return true;
  },
};
