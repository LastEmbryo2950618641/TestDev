window.GameModules = window.GameModules || {};
window.GameModules.domain = window.GameModules.domain || {};
window.GameModules.domain.worldline = window.GameModules.domain.worldline || {};

window.GameModules.domain.worldline.queryService = {
  worldlineFactions(lore) {
    const factions = this.loreWorldline(lore)?.factions || {};
    return Object.entries(factions).map(([id, value]) => ({ id, ...value }));
  },

  factionAttrs(faction) {
    return window.GameModules.domain.worldline.formatHelpers.factionAttrs.call(this, faction);
  },

  factionRelations(faction) {
    return window.GameModules.domain.worldline.formatHelpers.factionRelations.call(this, faction);
  },
};
