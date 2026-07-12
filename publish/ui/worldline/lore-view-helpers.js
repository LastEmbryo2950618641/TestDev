window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.worldline = window.GameModules.ui.worldline || {};

window.GameModules.ui.worldline.loreViewHelpers = {
  toggleLore(lore) {
    if (!this.loreWorldline(lore)) return;
    const tag = lore?.worldTag || '';
    if (!tag) return;
    this.expandedWorldlineTag = this.expandedWorldlineTag === tag ? '' : tag;
  },

  isLoreOpen(lore) {
    return Boolean(lore?.worldTag && this.expandedWorldlineTag === lore.worldTag);
  },

  controlLores() {
    const realTag = this.realWorldTag();
    return (this.savedWorldLores || []).filter((lore) => lore.worldTag !== realTag);
  },

  realTag() {
    return window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
  },


  controlLoreCardView(lore) {
    const current = lore || {};
    return {
      worldTag: current.worldTag || '',
      background: current.background || '',
      factions: Array.isArray(current.factions) ? current.factions : [],
      specialJobsText: this.loreNames(current.specialJobs, 'name'),
      jobRanksText: (current.jobRanks || []).join(' / ') || '无',
      specialFieldsText: this.loreNames(current.specialFields, 'label'),
      timelineVisible: this.isLoreOpen(current) && Boolean(this.loreWorldline(current)),
    };
  },

  realLoreCardView() {
    const real = this.realLore();
    return {
      worldTag: real.worldTag || '',
      background: real.background || '',
    };
  },
  realLore() {
    const tag = this.realWorldTag();
    const saved = (this.savedWorldLores || []).find((lore) => lore.worldTag === tag) || {};
    return {
      worldTag: tag,
      background: saved.background || this.playerProfile?.worldbuildingNote || '玩家所在的现代都市现实世界。',
      factions: saved.factions || [],
      specialJobs: saved.specialJobs || [],
      jobRanks: saved.jobRanks || [],
      specialFields: saved.specialFields || [],
      worldline: this.realWorldline(),
    };
  },
};
