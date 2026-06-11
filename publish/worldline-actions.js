/**
 * 图书馆世界线展示辅助。
 */
window.GameModules = window.GameModules || {};

window.GameModules.worldlineActions = {
  loreWorldline(lore) {
    return lore?.worldline || window.GameModules.sqliteSave.getWorldline?.(lore?.worldTag) || null;
  },

  worldlineEvents(lore) {
    return this.loreWorldline(lore)?.events || [];
  },

  worldlineFactions(lore) {
    const factions = this.loreWorldline(lore)?.factions || {};
    return Object.entries(factions).map(([id, value]) => ({ id, ...value }));
  },

  factionAttrs(faction) {
    return Object.entries(faction?.属性 || {}).map(([key, value]) => `${key}:${value}`).join('；') || '无';
  },

  factionRelations(faction) {
    return Object.entries(faction?.关系网 || {}).map(([key, value]) => `${key}:${value}`).join('；') || '无';
  },
};
