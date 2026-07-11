window.GameModules = window.GameModules || {};
window.GameModules.domain = window.GameModules.domain || {};
window.GameModules.domain.worldline = window.GameModules.domain.worldline || {};

window.GameModules.domain.worldline.queryService = {
  worldlinePlots(lore) {
    return window.GameModules.worldlinePlots.items(this.loreWorldline(lore) || {});
  },

  worldlineFactions(lore) {
    const factions = this.loreWorldline(lore)?.factions || {};
    return Object.entries(factions).map(([id, value]) => ({ id, ...value }));
  },

  connectionWorldlineEvent(line = {}, context = '') {
    return window.GameModules.domain.worldline.formatHelpers.connectionWorldlineEvent.call(this, line, context);
  },

  factionAttrs(faction) {
    return window.GameModules.domain.worldline.formatHelpers.factionAttrs.call(this, faction);
  },

  factionRelations(faction) {
    return window.GameModules.domain.worldline.formatHelpers.factionRelations.call(this, faction);
  },

  worldlineTurnEventId(result = {}) {
    return window.GameModules.domain.worldline.formatHelpers.worldlineTurnEventId.call(this, result);
  },

  worldlineSafeId(value = '') {
    return window.GameModules.domain.worldline.formatHelpers.worldlineSafeId.call(this, value);
  },

  worldlineTurnDetail(result = {}) {
    return window.GameModules.domain.worldline.formatHelpers.worldlineTurnDetail.call(this, result);
  },
};
