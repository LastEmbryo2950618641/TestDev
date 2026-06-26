window.GameModules = window.GameModules || {};

window.GameModules.wearingSyncActions = {
  async syncSolidifyWearing(cards = []) {
    for (const card of Array.isArray(cards) ? cards : []) await this.syncWearingForName(card.name, card.wearing || card.clothing || card.outfit, card);
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
      if (wearing) await this.syncWearingForName(name, wearing, { name, worldTag: window.GameModules.realWorld2026?.label });
    }
  },

  extractNarrationWearing(text = '', name = '') {
    const safe = String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!safe || !text.includes(name)) return '';
    const direct = [
      new RegExp(`${safe}[^。！？]{0,40}?穿着([^。！？]{2,80})`, 'u'),
      new RegExp(`${safe}[^。！？]{0,40}?一件([^。！？]{2,60})`, 'u'),
      new RegExp(`${safe}[^。！？]{0,40}?身上([^。！？]{2,80})`, 'u'),
    ].map((rx) => text.match(rx)?.[1]).find(Boolean);
    if (direct) return direct.replace(/，.*$/u, '').trim();
    const at = text.indexOf(name);
    const after = at >= 0 ? text.slice(at, at + 260) : '';
    const pronoun = after.match(/[她他其][^。！？]{0,30}?穿着([^。！？]{2,80})/u)?.[1];
    return pronoun ? pronoun.replace(/，.*$/u, '').trim() : '';
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
    await window.GameModules.sqliteSave.saveCharacterState?.(state);
    return true;
  },
};
