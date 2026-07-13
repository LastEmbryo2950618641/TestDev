window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.ai, {
  normalizeLexiconUpdates(value, store = {}) {
    const list = Array.isArray(value) ? value : [];
    const out = [];
    for (const item of list) {
      const normalized = this.normalizeLexiconUpdateItem(item, store);
      if (normalized) out.push(normalized);
      if (out.length >= 20) break;
    }
    return out;
  },

  normalizeLexiconKind(item = {}) {
    const kind = String(item?.kind || '').trim();
    if (kind) return kind.slice(0, 16);
    if (item?.term || item?.definition || item?.synonyms || item?.aliases) return '专用术语';
    return String(item?.type || '词条').trim().slice(0, 16);
  },

  normalizeLexiconUpdateItem(item, store = {}) {
    const name = String(item?.name || item?.term || item?.field || '').trim().slice(0, 32);
    const kind = this.normalizeLexiconKind(item);
    const reason = String(item?.reason || item?.modifyReason || '').trim().slice(0, 120);
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
    const aliases = Array.isArray(item?.aliases) ? item.aliases : item?.synonyms;
    if (Array.isArray(aliases)) update.aliases = aliases.map((alias) => String(alias).trim()).filter(Boolean).slice(0, 6);
    if (item?.type && !item?.kind) update.meta = { termType: String(item.type).slice(0, 32) };
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
