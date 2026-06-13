window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.ai, {
  normalizeLexiconUpdates(value, store = {}) {
    const list = Array.isArray(value) ? value : [];
    return list.map((item) => this.normalizeLexiconUpdateItem(item, store)).filter(Boolean).slice(0, 20);
  },

  normalizeLexiconUpdateItem(item, store = {}) {
    const name = String(item?.name || '').trim().slice(0, 32);
    const kind = String(item?.kind || '').trim().slice(0, 16);
    const reason = String(item?.reason || item?.modifyReason || '').trim().slice(0, 120);
    if (!name || !kind || !reason) return null;
    return {
      worldTag: String(item.worldTag || store.character?.work || '原创世界').slice(0, 40),
      kind,
      name,
      value: Object.prototype.hasOwnProperty.call(item, 'value') ? item.value : null,
      summary: String(item.summary || item.description || reason).slice(0, 80),
      description: String(item.description || reason).slice(0, 240),
      reason,
      source: 'ai',
      aiGenerated: true,
      changeMode: 'AI演算',
    };
  },
});
