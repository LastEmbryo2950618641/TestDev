window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.ai, {
  normalizeLexiconUpdates(value, store = {}) {
    const list = Array.isArray(value) ? value : [];
    return list.map((item) => this.normalizeLexiconUpdateItem(item, store)).filter(Boolean).slice(0, 20);
  },

  normalizeLexiconUpdateItem(item, store = {}) {
    const name = String(item?.name || item?.term || item?.field || '').trim().slice(0, 32);
    const kind = String(item?.kind || item?.type || '词条').trim().slice(0, 16);
    const reason = String(item?.reason || item?.modifyReason || item?.definition || '').trim().slice(0, 120);
    if (!name || !kind) return null;
    const safeReason = reason || 'AI根据当前上下文记录了这次词条变化。';
    const value = Object.prototype.hasOwnProperty.call(item, 'value') ? item.value : (item?.definition || item?.description || item?.summary || null);
    const update = {
      worldTag: String(item.worldTag || store.character?.work || '原创世界').slice(0, 40),
      kind,
      name,
      value,
      summary: String(item.summary || item.definition || item.description || safeReason).slice(0, 80),
      description: String(item.description || item.definition || safeReason).slice(0, 240),
      reason: safeReason,
      source: 'ai',
      aiGenerated: true,
      changeMode: 'AI演算',
    };
    if (Array.isArray(item?.synonyms)) update.aliases = item.synonyms.slice(0, 6).map(String);
    const target = String(item?.target || item?.targetId || item?.characterId || item?.owner || '').trim();
    if (item?.field) update.field = String(item.field).trim().slice(0, 32);
    if (target) {
      update.target = target.slice(0, 64);
      update.targetId = target.slice(0, 64);
    }
    if (item?.characterId) update.characterId = String(item.characterId).trim().slice(0, 64);
    if (kind === '角色卡' || kind === '角色技能') update.changeMode = kind === '角色技能' ? '角色卡词条添加Skill' : '角色卡词条修改Skill';
    return update;
  },
});
