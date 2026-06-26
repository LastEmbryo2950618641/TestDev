window.GameModules = window.GameModules || {};

window.GameModules.characterIntroCard = {
  worldOf(raw = {}, store = null) {
    return String(raw.worldTag || raw.work || store?.character?.work || window.GameModules.realWorld2026?.label || '未知世界').slice(0, 40);
  },

  normalize(raw = {}, store = null, source = 'ai') {
    const name = String(raw.name || raw.characterName || '').trim().slice(0, 24);
    if (!name) return null;
    const worldTag = source === 'real'
      ? String(raw.worldTag || raw.work || window.GameModules.realWorld2026?.label || '2026 现代都市现实世界').slice(0, 40)
      : this.worldOf(raw, store);
    return {
      name,
      worldTag,
      role: String(raw.role || raw.identity || '出场人物').trim().slice(0, 40),
      intro: String(raw.intro || raw.detail || raw.description || raw.summary || '本回合被提及或出现的人物，细节尚未固化。').trim().slice(0, 280),
      source,
      solidifyStatus: 'pending',
    };
  },

  roleCardState(card = {}) {
    const save = window.GameModules.sqliteSave;
    return save?.getCharacterStateByName?.(card.name, card.worldTag) || save?.getCharacterStateByName?.(card.name) || null;
  },

  roleCardExists(card = {}) { return Boolean(this.roleCardState(card)); },

  async ensure(store, raw = {}, source = 'ai') {
    const card = this.normalize(raw, store, source);
    if (!card) return null;
    if (this.roleCardExists(card)) return { ...card, displayType: 'role' };
    const save = window.GameModules.sqliteSave;
    const existing = save?.getCharacterIntro?.(card.name, card.worldTag);
    if (existing) return existing;
    return await save?.saveCharacterIntro?.({ ...card, createdAt: new Date().toISOString() });
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
