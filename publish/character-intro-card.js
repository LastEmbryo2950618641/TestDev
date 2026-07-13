window.GameModules = window.GameModules || {};

window.GameModules.characterIntroCard = {
  worldOf(raw = {}, store = null) {
    return String(store?.currentWorldTag?.() || raw.worldTag || raw.work || store?.character?.work || window.GameModules.realWorld2026?.label || '未知世界').slice(0, 40);
  },

  normalize(raw = {}, store = null, source = 'ai') {
    const name = String(raw.name || raw.characterName || '').trim().slice(0, 24);
    if (!name) return null;
    const worldTag = store?.currentWorldTag?.()
      || (source === 'real'
        ? String(window.GameModules.realWorld2026?.label || '2026 现代都市现实世界').slice(0, 40)
        : this.worldOf(raw, store));
    return {
      name,
      worldTag,
      role: String(raw.role || raw.identity || '出场人物').trim().slice(0, 40),
      intro: String(raw.intro || raw.detail || raw.description || raw.summary || '本回合被提及或出现的人物，细节尚未固化。').trim().slice(0, 280),
      wearing: raw.wearing || raw.clothing || raw.outfit || '',
      source,
      solidifyStatus: 'pending',
    };
  },

  roleCardState(card = {}) {
    const stateStore = window.GameModules.characterStateStore;
    const worldTag = window.GameModules.characterQuery?.normalizeWorldTag?.(card.worldTag || card.work) || card.worldTag;
    return stateStore?.getByName?.(card.name, worldTag)
      || (stateStore?.list?.() || []).find((state) => {
        const profile = state?.profile || {};
        const sameName = state?.name === card.name || profile.name === card.name;
        const sameWorld = window.GameModules.characterQuery?.worldMatches?.(worldTag, state?.worldTag || profile.work) ?? (!worldTag || state?.worldTag === worldTag || profile.work === worldTag);
        return sameName && sameWorld;
      })
      || null;
  },

  roleCardExists(card = {}) { return Boolean(this.roleCardState(card)); },

  async ensure(store, raw = {}, source = 'ai') {
    const card = this.normalize(raw, store, source);
    if (!card) return null;
    if (this.roleCardExists(card)) return { ...card, displayType: 'role' };
    const introStore = window.GameModules.characterIntroStore;
    const existing = introStore?.get?.(card.name, card.worldTag);
    if (existing) return existing;
    return await introStore?.save?.({ ...card, createdAt: new Date().toISOString() });
  },

  async ensureMany(store, items = [], source = 'ai') {
    const out = [];
    for (const item of Array.isArray(items) ? items : []) {
      const card = await this.ensure(store, item, source);
      if (card) out.push(card);
    }
    return out;
  },
};
